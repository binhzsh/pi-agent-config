/**
 * Context Stats Extension
 *
 * Tracks and displays context window usage statistics.
 * Shows token consumption, context savings, and per-tool breakdown.
 *
 * Zero external dependencies — uses only node:fs, node:path.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { homedir } from "node:os";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";

// ─── Constants ───────────────────────────────────────────────────────

const SANDBOX_DIR = join(homedir(), ".pi", "agent", "context-sandbox");
const STATS_FILE = join(homedir(), ".pi", "agent", "context-stats.json");
const MAX_DISPLAY_ENTRIES = 20;

// ─── Stats Storage ───────────────────────────────────────────────────

interface StatsEntry {
  timestamp: number;
  tool: string;
  tokens: number;
  message?: string;
  sandboxed?: boolean;
  sandboxTokens?: number;
}

interface SessionStats {
  version: "1.0";
  sessionStart: number;
  entries: StatsEntry[];
  totalInputTokens: number;
  totalOutputTokens: number;
  contextWindow: number;
}

function loadSessionStats(): SessionStats {
  if (existsSync(STATS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(STATS_FILE, "utf-8"));
      if (data && data.version === "1.0") return data;
    } catch { /* ignore */ }
  }
  return {
    version: "1.0",
    sessionStart: Date.now(),
    entries: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    contextWindow: 262144, // Default: 256K
  };
}

function saveSessionStats(stats: SessionStats): void {
  try {
    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf-8");
  } catch { /* ignore */ }
}

function recordStats(tool: string, tokens: number, sandboxed = false, sandboxTokens = 0): void {
  const stats = loadSessionStats();
  stats.entries.push({
    timestamp: Date.now(),
    tool,
    tokens,
    sandboxed,
    sandboxTokens,
  });
  stats.totalInputTokens += tokens;
  saveSessionStats(stats);
}

function getProjectSandboxDir(): string | null {
  try {
    const { execSync } = require("node:child_process");
    const projectRoot = execSync("git rev-parse --show-toplevel 2>/dev/null", { encoding: "utf-8" }).trim();
    const projectSandbox = join(projectRoot, ".pi", "context-sandbox");
    if (existsSync(projectSandbox)) return projectSandbox;
    return null;
  } catch {
    return null;
  }
}

function getSandboxSize(): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const full = join(dir, entry);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else {
          files++;
          bytes += s.size;
        }
      }
    } catch { /* skip */ }
  }

  // Check project sandbox first
  const projectDir = getProjectSandboxDir();
  if (projectDir) walk(projectDir);

  // Then global sandbox
  if (existsSync(SANDBOX_DIR)) walk(SANDBOX_DIR);

  return { files, bytes };
}

function countSandboxedCommands(): number {
  // Count ctx_execute and ctx_execute_file calls from sandbox raw files
  let count = 0;

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const full = join(dir, entry);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else {
          try {
            const content = readFileSync(full, "utf-8");
            if (content.includes("[sandboxed]")) count++;
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  const projectDir = getProjectSandboxDir();
  if (projectDir) walk(join(projectDir, "raw"));
  if (existsSync(SANDBOX_DIR)) walk(join(SANDBOX_DIR, "raw"));

  return count;
}

// ─── Commands ────────────────────────────────────────────────────────

function showStats(ctx: ExtensionContext, detailed = false, savings = false): void {
  const stats = loadSessionStats();
  const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
  const utilization = (totalTokens / stats.contextWindow * 100);
  const remaining = stats.contextWindow - totalTokens;

  // Per-tool breakdown
  const toolBreakdown = new Map<string, number>();
  for (const entry of stats.entries) {
    toolBreakdown.set(entry.tool, (toolBreakdown.get(entry.tool) || 0) + entry.tokens);
  }

  const sortedTools = Array.from(toolBreakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DISPLAY_ENTRIES);

  // Sandbox stats
  const sandboxInfo = getSandboxSize();
  const sandboxedCount = countSandboxedCommands();

  // Estimate savings (rough: sandboxed commands save ~80% of their output tokens)
  const sandboxedTokens = stats.entries
    .filter(e => e.sandboxed)
    .reduce((sum, e) => sum + (e.sandboxTokens || 0), 0);
  const estimatedSavings = Math.round(sandboxedTokens * 0.8);

  // Build output
  const lines: string[] = [];

  lines.push("┌─────────────────────────────────────────────────────────────────────┐");
  lines.push("│ Context Window Usage                                                │");
  lines.push("├─────────────────────────────────────────────────────────────────────┤");
  lines.push(`│ Total tokens:     ${padRight(`${totalTokens.toLocaleString()} / ${stats.contextWindow.toLocaleString()}`, 45)}│`);
  lines.push(`│ Utilization:      ${padRight(`${utilization.toFixed(1)}%`, 45)}│`);
  lines.push(`│ Remaining:        ${padRight(`${remaining.toLocaleString()} tokens`, 45)}│`);
  lines.push("├─────────────────────────────────────────────────────────────────────┤");

  if (sandboxedCount > 0) {
    lines.push(`│ Commands sandboxed: ${padRight(`${sandboxedCount}`, 45)}│`);
    lines.push(`│ Estimated saved:    ${padRight(`${estimatedSavings.toLocaleString()} tokens`, 45)}│`);
    lines.push("├─────────────────────────────────────────────────────────────────────┤");
  }

  if (sandboxInfo.files > 0) {
    lines.push(`│ Sandbox: ${padRight(`${sandboxInfo.files} files, ${(sandboxInfo.bytes / 1024 / 1024).toFixed(1)} MB`, 45)}│`);
    lines.push("├─────────────────────────────────────────────────────────────────────┤");
  }

  lines.push("│ Per-Tool Breakdown                                                  │");
  for (const [tool, tokens] of sortedTools) {
    const pct = totalTokens > 0 ? (tokens / totalTokens * 100).toFixed(1) : "0.0";
    const bar = "█".repeat(Math.round(tokens / totalTokens * 20)) + "░".repeat(20 - Math.round(tokens / totalTokens * 20));
    lines.push(`│ ${padRight(`${tool}:`, 20)} ${padRight(`${tokens.toLocaleString()} (${pct}%)`, 18)}│`);
  }

  lines.push("└─────────────────────────────────────────────────────────────────────┘");

  // Detailed view
  if (detailed && stats.entries.length > 0) {
    lines.push("");
    lines.push("┌─────────────────────────────────────────────────────────────────────┐");
    lines.push("│ Detailed Breakdown                                                  │");
    lines.push("├──────────┬──────────┬──────────┬──────────────────────────────────┤");
    lines.push("│ Message  │ Tokens   │ Tool     │ Summary                          │");
    lines.push("├──────────┼──────────┼──────────┼──────────────────────────────────┤");

    const recent = stats.entries.slice(-MAX_DISPLAY_ENTRIES);
    for (let i = 0; i < recent.length; i++) {
      const entry = recent[i];
      const msg = entry.message ? entry.message.slice(0, 38) : "";
      lines.push(`│ #${(stats.entries.length - recent.length + i + 1).toString().padStart(7)} │ ${entry.tokens.toString().padStart(9)} │ ${entry.tool.padStart(9)} │ ${msg.padEnd(38)}│`);
    }

    lines.push("└─────────────────────────────────────────────────────────────────────┘");
  }

  // Savings analysis
  if (savings && sandboxedCount > 0) {
    lines.push("");
    lines.push("┌─────────────────────────────────────────────────────────────────────┐");
    lines.push("│ Context Savings Analysis                                            │");
    lines.push("├─────────────────────────────────────────────────────────────────────┤");
    lines.push(`│ Commands sandboxed: ${padRight(`${sandboxedCount}`, 45)}│`);
    lines.push(`│ Tokens saved:       ${padRight(`${estimatedSavings.toLocaleString()}`, 45)}│`);
    const savingsRate = totalTokens > 0 ? (estimatedSavings / (estimatedSavings + totalTokens) * 100).toFixed(1) : "0.0";
    lines.push(`│ Savings rate:       ${padRight(`${savingsRate}%`, 45)}│`);
    lines.push("└─────────────────────────────────────────────────────────────────────┘");
  }

  // Recommendations
  lines.push("");
  if (utilization > 90) {
    lines.push("⚠️  CRITICAL: Context window nearly full! Consider:");
    lines.push("   - Using ctx_purge to clear old sandboxed content");
    lines.push("   - Using ctx_execute for all future commands");
    lines.push("   - Starting a new session");
  } else if (utilization > 75) {
    lines.push("⚠️  Context window at " + utilization.toFixed(0) + "% — consider using context-manager more aggressively.");
  } else if (utilization > 50) {
    lines.push("ℹ️  Context window at " + utilization.toFixed(0) + "% — consider sandboxing large outputs.");
  } else {
    lines.push("✓ Context window usage is healthy.");
  }

  ctx.ui.notify(lines.join("\n"), utilization > 90 ? "error" : utilization > 75 ? "warning" : "info");
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

// ─── Extension ───────────────────────────────────────────────────────

export default function piContextStats(pi: ExtensionAPI) {
  pi.registerCommand("context-stats", {
    description: "Show context window usage statistics",
    getArgumentCompletions: (prefix) => {
      const options = ["--detailed", "--savings", "--reset"];
      return options.filter(o => o.startsWith(prefix)).map(o => ({ value: o, label: o }));
    },
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const detailed = parts.includes("--detailed");
      const savings = parts.includes("--savings");
      const reset = parts.includes("--reset");

      if (reset) {
        if (existsSync(STATS_FILE)) {
          try { unlinkSync(STATS_FILE); } catch { /* ignore */ }
          ctx.ui.notify("Context stats reset.", "info");
        } else {
          ctx.ui.notify("No stats to reset.", "info");
        }
        return;
      }

      showStats(ctx, detailed, savings);
    },
  });

  // Auto-record tool usage via hooks
  pi.on("tool_use", async (event) => {
    const toolName = (event as any).tool_name;
    const tokens = (event as any).tokens || 0;
    if (toolName && tokens > 0) {
      recordStats(toolName, tokens);
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    const stats = loadSessionStats();
    stats.sessionStart = Date.now();
    stats.entries = [];
    stats.totalInputTokens = 0;
    stats.totalOutputTokens = 0;
    saveSessionStats(stats);
    ctx.ui.setStatus("context", "tracking");
  });

  pi.on("session_end", async () => {
    const stats = loadSessionStats();
    const duration = ((Date.now() - stats.sessionStart) / 1000).toFixed(0);
    const totalTokens = stats.totalInputTokens + stats.totalOutputTokens;
    console.log(`[context-stats] Session ended: ${totalTokens.toLocaleString()} tokens, ${duration}s`);
  });
}
