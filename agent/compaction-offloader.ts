/**
 * Compaction Offloader
 *
 * 1. Offloads compaction + branch summarization to local Ollama gemma (free)
 * 2. Prunes stale tool results from context on every turn to keep context lean
 * 3. On-demand compaction command
 *
 * Falls back to default pi behavior on any error.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { serializeConversation } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "./lib/config.js";

const OFFLOAD_URL = loadConfig().offloadUrl;
const MODEL = loadConfig().offloadModel;
const PROVIDER = loadConfig().offloadProvider;
const KEEP_ALIVE = loadConfig().offloadKeepAlive;

// Ollama's OpenAI-compatible /v1 endpoint silently ignores `keep_alive`; only the
// native /api/chat honors it. Derive the native chat URL from the configured base.
const NATIVE_CHAT_URL = OFFLOAD_URL.replace(/\/v1\/.*$/, "") + "/api/chat";

// Max age (ms) for a tool result before it's considered stale and truncated.
// 3 turns worth — covers the immediate tool call → result → next assistant turn chain.
const STALE_MS = 5 * 60 * 1000; // 5 minutes

// Max chars to keep from a stale tool result (rest replaced with a summary line).
const STALE_KEEP_CHARS = 800;

// Tool result types that are almost always safe to truncate aggressively.
const BULK_TOOLS = new Set([
  "read",
  "bash",
  "grep",
  "find",
  "ls",
]);

// ─── Compaction prompt ─────────────────────────────────────────────

const COMPACT_PROMPT = `You are a conversation summarizer for a coding assistant. Create a structured summary of this conversation.

Format your response using these exact sections:

## Goal
[What the user is trying to accomplish]

## Constraints & Preferences
- [Requirements mentioned by user]

## Progress
### Done
- [x] [Completed tasks]

### In Progress
- [ ] [Current work]

### Blocked
- [Issues, if any]

## Key Decisions
- **[Decision]**: [Rationale]

## Next Steps
1. [What should happen next]

## Critical Context
- [Data needed to continue]

<read-files>
[list files that were read, one per line]
</read-files>

<modified-files>
[list files that were modified, one per line]
</modified-files>

Be thorough but concise. Capture all technical decisions, file paths, and code patterns.
The summary replaces the conversation history, so include everything needed to continue.

<conversation>
{conversation}
</conversation>`;

// ─── Extension ─────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let active = true;
  let pruneStats: { turns: number; pruned: number; saved: number } = {
    turns: 0,
    pruned: 0,
    saved: 0,
  };

  // ─── Status banner ────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    pruneStats = { turns: 0, pruned: 0, saved: 0 };
    ctx.ui.setStatus("compaction", "⚡ Local compaction + pruning");
    setTimeout(() => {
      try {
        ctx.ui.setStatus("compaction", "");
      } catch {
        /* stale */
      }
    }, 3000);

    // One-time reachability probe so a down Ollama server is *visibly* reported
    // instead of silently falling back to the (paid) default model.
    void probeOffload().then((up) => {
      if (!up) {
        try {
          ctx.ui.setStatus("compaction", "⚠️ Ollama offline — compaction falls back to default model");
          ctx.ui.notify(
            `Compaction offloader: Ollama unreachable at ${OFFLOAD_URL}. Compaction/summarization will use the default (paid) model until it's back.`,
            "warning",
          );
        } catch {
          /* stale */
        }
      }
    });
  });

  // ─── Context pruning (every turn) ─────────────────────────────

  pi.on("context", async (event, _ctx) => {
    if (!active) return;

    const result = pruneStaleResults(event.messages);
    if (result.pruned > 0) {
      pruneStats.turns++;
      pruneStats.pruned += result.pruned;
      pruneStats.saved += result.saved;
    }
    return { messages: result.messages };
  });

  // ─── Compaction ───────────────────────────────────────────────

  pi.on("session_before_compact", async (event, ctx) => {
    if (!active) return;

    const { preparation, signal } = event;
    const {
      messagesToSummarize,
      turnPrefixMessages,
      tokensBefore,
      firstKeptEntryId,
      previousSummary,
    } = preparation;

    const allMessages = [...messagesToSummarize, ...turnPrefixMessages];
    if (allMessages.length === 0) return;

    const model = ctx.modelRegistry.find(PROVIDER, MODEL);
    if (!model) {
      if (!signal?.aborted)
        ctx.ui.notify("Compaction: Ollama model not found, using default", "warning");
      return;
    }

    ctx.ui.setStatus("compaction", "🔄 Summarizing with Ollama...");

    // Build conversation text from the messages to summarize
    const textParts: string[] = [];
    for (const msg of allMessages) {
      const part = formatMessageForSummary(msg);
      if (part) textParts.push(part);
    }
    const conversationText = textParts.join("\n\n");

    const previousContext = previousSummary
      ? `\n\nPrevious compaction summary for context:\n${previousSummary}`
      : "";

    const prompt = COMPACT_PROMPT.replace("{conversation}", conversationText) + previousContext;

    try {
      const summary = await callOffload(prompt, signal);

      if (!summary.trim()) {
        if (!signal?.aborted)
          ctx.ui.notify("Compaction: empty summary, using default", "warning");
        return;
      }

      const fileOps = extractFileOps(allMessages);

      ctx.ui.setStatus(
        "compaction",
        `✅ Compact (${(summary.length / 1024).toFixed(1)}KB, freed ${formatTokens(tokensBefore)})`,
      );
      setTimeout(() => {
        try {
          ctx.ui.setStatus("compaction", "");
        } catch {
          /* stale */
        }
      }, 5000);

      return {
        compaction: {
          summary,
          firstKeptEntryId,
          tokensBefore,
          details: fileOps,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!signal?.aborted)
        ctx.ui.notify(`Compaction failed (${message}), using default`, "warning");
      return; // fall back to default compaction
    }
  });

  // ─── Branch summarization (/tree) ─────────────────────────────

  pi.on("session_before_tree", async (event, ctx) => {
    if (!active || !event.preparation.userWantsSummary) return;

    const { preparation, signal } = event;
    const { entriesToSummarize } = preparation;
    if (entriesToSummarize.length === 0) return;

    const model = ctx.modelRegistry.find(PROVIDER, MODEL);
    if (!model) return;

    ctx.ui.setStatus("compaction", "🔄 Branch summary...");

    // Build text from branch entries
    const textParts: string[] = [];
    for (const entry of entriesToSummarize) {
      if (entry.type !== "message" || !entry.message) continue;
      const part = formatMessageForSummary(entry.message);
      if (part) textParts.push(part);
    }

    if (textParts.length === 0) return;

    const prompt = `Summarize this abandoned branch of work. Use the same format as a compaction summary (Goal, Progress, Key Decisions, Next Steps, Critical Context, read-files, modified-files).

<conversation>
${textParts.join("\n\n")}
</conversation>`;

    try {
      const summary = await callOffload(prompt, signal);

      if (summary.trim()) {
        ctx.ui.setStatus("compaction", "✅ Branch summary");
        setTimeout(() => {
          try {
            ctx.ui.setStatus("compaction", "");
          } catch {
            /* stale */
          }
        }, 3000);

        return {
          summary: {
            summary,
            details: extractFileOpsFromEntries(entriesToSummarize),
          },
        };
      }
    } catch {
      // fall back to default
    }
  });

  // ─── Commands ─────────────────────────────────────────────────

  pi.registerCommand("compact-status", {
    description: "Show compaction offloader status and stats",
    handler: async (_args, ctx) => {
      const model = ctx.modelRegistry.find(PROVIDER, MODEL);
      const lines = [
        active ? "✅ Active" : "❌ Disabled",
        model
          ? `Model: Ollama/${MODEL}`
          : "⚠️ Ollama model not found",
        `Pruning: ${pruneStats.pruned} results pruned, saved ~${formatTokens(pruneStats.saved)} over ${pruneStats.turns} turns`,
      ];
      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("compact-now", {
    description: "Force compaction now (uses local Ollama model)",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Triggering compaction...", "info");
      ctx.compact({
        customInstructions:
          "Comprehensive summary — this is a manual compaction request.",
        onComplete: (result) => {
          ctx.ui.notify(
            `Compaction complete: summary ${(result.summary.length / 1024).toFixed(1)}KB, freed ${formatTokens(result.tokensBefore)}`,
            "info",
          );
        },
        onError: (error) => {
          ctx.ui.notify(`Compaction failed: ${error.message}`, "error");
        },
      });
    },
  });
}

// ─── Context Pruning ───────────────────────────────────────────────

/**
 * Prune stale tool results from context.
 *
 * Strategy: walk messages backward, find tool results older than STALE_MS
 * relative to the newest message. Truncate their content to the first
 * STALE_KEEP_CHARS and append a "[truncated] summary line.
 *
 * Only prunes tool results from BULK_TOOLS (read, bash, grep, find, ls)
 * to avoid losing important assistant reasoning or user messages.
 *
 * Never prunes the last 3 message pairs (user → assistant → tool results)
 * to keep immediate context intact.
 */
function pruneStaleResults(messages: any[]): {
  messages: any[];
  pruned: number;
  saved: number;
} {
  if (messages.length < 6) return { messages, pruned: 0, saved: 0 };

  const newestTs = messages[messages.length - 1]?.timestamp ?? Date.now();
  const cutoff = newestTs - STALE_MS;

  // Keep the last ~3 turns untouched (roughly last 6-9 messages)
  const protectTail = Math.min(9, messages.length - 1);
  const pruneBoundary = messages.length - protectTail;

  let pruned = 0;
  let saved = 0;
  const result = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Never touch protected tail
    if (i >= pruneBoundary) {
      result.push(msg);
      continue;
    }

    // Only prune tool results from bulk tools
    if (
      msg.role === "toolResult" &&
      BULK_TOOLS.has(msg.toolName) &&
      msg.timestamp < cutoff
    ) {
      const content = msg.content;
      if (Array.isArray(content)) {
        let fullText = content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");

        if (fullText.length > STALE_KEEP_CHARS) {
          const kept = fullText.slice(0, STALE_KEEP_CHARS);
          const lineCount = fullText.split("\n").length;
          const truncated = {
            ...msg,
            content: [
              {
                type: "text",
                text: `${kept}\n\n[truncated: ${lineCount} lines, ${(fullText.length / 1024).toFixed(1)}KB — result from earlier turn, kept first ${STALE_KEEP_CHARS} chars]`,
              },
            ],
          };
          result.push(truncated);
          saved += fullText.length - STALE_KEEP_CHARS - 100; // ~100 for the truncation marker
          pruned++;
          continue;
        }
      }
    }

    result.push(msg);
  }

  return { messages: result, pruned, saved };
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Best-effort reachability check for the Ollama endpoint (2s timeout). */
async function probeOffload(): Promise<boolean> {
  try {
    const base = OFFLOAD_URL.replace(/\/v1\/.*$/, "");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${base}/v1/models`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function callOffload(prompt: string, signal?: AbortSignal): Promise<string> {
  // Native /api/chat (not /v1) so `keep_alive` is honored — keeps the model
  // resident between compaction bursts instead of reloading each time.
  const response = await fetch(NATIVE_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      keep_alive: KEEP_ALIVE,
      options: { num_predict: 8192 },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content ?? "";
}

/**
 * Format an agent message into the serialized text format that the
 * compaction prompt expects (matching pi's serializeConversation output).
 */
function formatMessageForSummary(msg: any): string | null {
  if (!msg || !msg.role) return null;

  if (msg.role === "user") {
    const text = extractText(msg.content);
    return text ? `[User]: ${text}` : null;
  }

  if (msg.role === "assistant") {
    const parts: string[] = [];
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") {
          parts.push(`[Assistant]: ${block.text}`);
        } else if (block.type === "thinking") {
          parts.push(`[Assistant thinking]: ${block.thinking}`);
        } else if (block.type === "toolCall" || block.type === "tool_use") {
          const args =
            typeof block.arguments === "string"
              ? block.arguments
              : JSON.stringify(block.arguments ?? block.input ?? {});
          parts.push(`[Assistant tool calls]: ${block.name}(${args})`);
        }
      }
    }
    return parts.length > 0 ? parts.join("\n") : null;
  }

  if (msg.role === "toolResult") {
    const text = extractText(msg.content);
    return text ? `[Tool result]: ${text.slice(0, 2000)}` : null;
  }

  if (msg.role === "bashExecution") {
    return `[Bash]: ${msg.command}\n[Output]: ${msg.output?.slice(0, 2000) ?? ""}`;
  }

  return null;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c && c.type === "text" && typeof c.text === "string")
      .map((c: any) => c.text)
      .join("\n");
  }
  return "";
}

function extractFileOps(messages: any[]): {
  readFiles: string[];
  modifiedFiles: string[];
} {
  const readFiles = new Set<string>();
  const modifiedFiles = new Set<string>();

  for (const msg of messages) {
    if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;

    for (const block of msg.content) {
      if (block.type !== "toolCall" && block.type !== "tool_use") continue;
      const name = block.name ?? "";
      const args =
        typeof block.arguments === "string"
          ? safeJsonParse(block.arguments)
          : block.arguments ?? block.input ?? {};

      if (name === "read" && args?.path) readFiles.add(args.path);
      if ((name === "write" || name === "edit") && args?.path)
        modifiedFiles.add(args.path);
    }
  }

  return { readFiles: [...readFiles], modifiedFiles: [...modifiedFiles] };
}

function extractFileOpsFromEntries(entries: any[]): {
  readFiles: string[];
  modifiedFiles: string[];
} {
  const readFiles = new Set<string>();
  const modifiedFiles = new Set<string>();

  for (const entry of entries) {
    if (entry.type !== "message" || !entry.message) continue;
    const msg = entry.message;
    if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;

    for (const block of msg.content) {
      if (block.type !== "toolCall" && block.type !== "tool_use") continue;
      const name = block.name ?? "";
      const args =
        typeof block.arguments === "string"
          ? safeJsonParse(block.arguments)
          : block.arguments ?? block.input ?? {};

      if (name === "read" && args?.path) readFiles.add(args.path);
      if ((name === "write" || name === "edit") && args?.path)
        modifiedFiles.add(args.path);
    }
  }

  return { readFiles: [...readFiles], modifiedFiles: [...modifiedFiles] };
}

function safeJsonParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
