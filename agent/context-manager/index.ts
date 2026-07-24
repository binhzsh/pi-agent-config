/**
 * Context Manager Extension
 *
 * Manages context window usage by sandboxing large tool outputs.
 * Provides ctx_execute, ctx_index, ctx_search, ctx_execute_file, and ctx_purge.
 *
 * Zero external dependencies — uses only node:fs, node:path, node:child_process, node:sqlite3.
 */
import type { ExtensionAPI, AgentToolResult, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { join, dirname, basename, extname } from "node:path";
import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";

// ─── Constants ───────────────────────────────────────────────────────

const SANDBOX_DIR = join(homedir(), ".pi", "agent", "context-sandbox");
const RAW_DIR = join(SANDBOX_DIR, "raw");
const INDEXED_DIR = join(SANDBOX_DIR, "indexed");
const SEARCH_DB = join(SANDBOX_DIR, "search-index.db");

const MAX_SANDBOX_SIZE_MB = 100;
const DEFAULT_MAX_OUTPUT_LINES = 1000;

// ─── Helpers ─────────────────────────────────────────────────────────

function ensureDirs(): void {
  [SANDBOX_DIR, RAW_DIR, INDEXED_DIR].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}_${random}`;
}

function getProjectSandboxDir(): string | null {
  try {
    const projectRoot = execSync("git rev-parse --show-toplevel 2>/dev/null", { encoding: "utf-8" }).trim();
    const projectSandbox = join(projectRoot, ".pi", "context-sandbox");
    if (existsSync(projectSandbox)) return projectSandbox;
    return null;
  } catch {
    return null;
  }
}

function getEffectiveSandboxDir(): string {
  const projectDir = getProjectSandboxDir();
  if (projectDir) {
    const raw = join(projectDir, "raw");
    const indexed = join(projectDir, "indexed");
    [raw, indexed].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });
    return projectDir;
  }
  ensureDirs();
  return SANDBOX_DIR;
}

function checkSandboxSize(): void {
  const totalSize = getSandboxSizeBytes();
  const maxBytes = MAX_SANDBOX_SIZE_MB * 1024 * 1024;
  if (totalSize > maxBytes) {
    // Auto-prune oldest files
    const files = getFilesByAge();
    let freed = 0;
    for (const file of files) {
      try {
        freed += statSync(file).size;
        unlinkSync(file);
        if (getSandboxSizeBytes() < maxBytes) break;
      } catch { /* skip */ }
    }
  }
}

function getSandboxSizeBytes(): number {
  let total = 0;
  const dir = getEffectiveSandboxDir();
  function walk(p: string): void {
    try {
      const entries = readdirSync(p);
      for (const entry of entries) {
        const full = join(p, entry);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else total += s.size;
      }
    } catch { /* skip */ }
  }
  walk(dir);
  return total;
}

function getFilesByAge(): string[] {
  const dir = getEffectiveSandboxDir();
  const files: Array<{ path: string; mtime: number }> = [];
  function walk(p: string): void {
    try {
      const entries = readdirSync(p);
      for (const entry of entries) {
        const full = join(p, entry);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else files.push({ path: full, mtime: s.mtimeMs });
      }
    } catch { /* skip */ }
  }
  walk(dir);
  return files.sort((a, b) => a.mtime - b.mtime).map(f => f.path);
}

// ─── SQLite Search Index ─────────────────────────────────────────────

function initSearchDB(): void {
  if (existsSync(SEARCH_DB)) return;

  // Use node:sqlite (built-in since Node 22, or fallback to file-based)
  try {
    const { open } = require("better-sqlite3") || null;
    if (open) {
      const db = open(SEARCH_DB);
      db.exec(`
        CREATE TABLE IF NOT EXISTS search_index (
          id TEXT PRIMARY KEY,
          label TEXT,
          file_path TEXT,
          indexed_at INTEGER
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS search_index_fts USING fts5(
          content,
          content=search_index,
          content_rowid=id
        );
      `);
      db.close();
    }
  } catch {
    // SQLite not available, use file-based search
  }
}

function fileBasedSearch(query: string, limit: number, contextLines: number): string {
  const dir = getEffectiveSandboxDir();
  const results: Array<{ file: string; line: number; content: string }> = [];
  const queryLower = query.toLowerCase();

  function walk(p: string): void {
    if (results.length >= limit * 3) return; // Over-fetch to find context lines
    try {
      const entries = readdirSync(p);
      for (const entry of entries) {
        const full = join(p, entry);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else if (s.size < 10 * 1024 * 1024) { // Skip files > 10MB
          try {
            const content = readFileSync(full, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(queryLower)) {
                // Collect context lines
                const start = Math.max(0, i - contextLines);
                const end = Math.min(lines.length, i + contextLines + 1);
                const context = lines.slice(start, end).map((l, idx) => {
                  const lineNum = start + idx + 1;
                  const marker = lineNum === i + 1 ? " >>> " : "     ";
                  return `${marker}${lineNum}: ${l}`;
                }).join("\n");

                results.push({
                  file: full,
                  line: i + 1,
                  content: context,
                });

                if (results.length >= limit) return;
              }
            }
          } catch { /* skip unreadable files */ }
        }
      }
    } catch { /* skip */ }
  }

  walk(dir);
  return results.map(r => `📄 ${r.file}:${r.line}\n${r.content}\n`).join("\n");
}

// ─── Tools ───────────────────────────────────────────────────────────

function ctxExecute(args: { command: string; max_output_lines?: number }): AgentToolResult {
  const maxLines = args.max_output_lines ?? DEFAULT_MAX_OUTPUT_LINES;
  const id = generateId();
  const outputFile = join(getEffectiveSandboxDir(), "raw", `${id}.txt`);

  try {
    const output = execSync(args.command, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024, // 50MB max buffer
    });

    const lines = output.split("\n");
    const truncated = lines.length > maxLines
      ? lines.slice(0, maxLines).join("\n") + `\n\n... truncated (${lines.length - maxLines} lines omitted)`
      : output;

    writeFileSync(outputFile, truncated, "utf-8");
    checkSandboxSize();

    return {
      content: [{
        type: "text",
        text: `✅ Output saved to sandbox (${lines.length} lines → ${Math.min(lines.length, maxLines)} lines kept)\n📁 Path: ${outputFile}\n💡 Use ctx_index to make this searchable, or ctx_execute_file for one-shot extraction.`,
      }],
      details: { id, lines: lines.length, saved: Math.min(lines.length, maxLines), file: outputFile },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Still save error output
    writeFileSync(outputFile, `ERROR: ${message}`, "utf-8");
    return {
      content: [{ type: "text", text: `❌ Command failed: ${message}\n📁 Error saved to: ${outputFile}` }],
      details: { error: message, file: outputFile },
      isError: true,
    };
  }
}

function ctxIndex(args: { file_path: string; label?: string }): AgentToolResult {
  const filePath = args.file_path;

  if (!existsSync(filePath)) {
    return {
      content: [{ type: "text", text: `❌ File not found: ${filePath}` }],
      isError: true,
    };
  }

  const id = generateId();
  const indexPath = join(getEffectiveSandboxDir(), "indexed", `${id}.txt`);

  try {
    const content = readFileSync(filePath, "utf-8");
    writeFileSync(indexPath, `[indexed:${args.label || basename(filePath)}]\n${content}`, "utf-8");

    return {
      content: [{
        type: "text",
        text: `✅ Indexed: ${filePath}\n📁 Index: ${indexPath}\n📝 Label: ${args.label || basename(filePath)}\n💡 Use ctx_search to find content in indexed files.`,
      }],
      details: { id, source: filePath, label: args.label, index: indexPath },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `❌ Failed to index: ${message}` }],
      isError: true,
    };
  }
}

function ctxSearch(args: { query: string; limit?: number; context_lines?: number }): AgentToolResult {
  const limit = args.limit ?? 10;
  const contextLines = args.context_lines ?? 3;

  const results = fileBasedSearch(args.query, limit, contextLines);

  if (!results.trim()) {
    return {
      content: [{ type: "text", text: `No matches found for "${args.query}" in sandbox.` }],
    };
  }

  return {
    content: [{
      type: "text",
      text: `🔍 Search results for "${args.query}" (showing up to ${limit} matches):\n\n${results}`,
    }],
    details: { query: args.query, limit, contextLines },
  };
}

function ctxExecuteFile(args: { command: string; search_pattern?: string; max_output_lines?: number }): AgentToolResult {
  const maxLines = args.max_output_lines ?? DEFAULT_MAX_OUTPUT_LINES;
  const id = generateId();
  const outputFile = join(getEffectiveSandboxDir(), "raw", `${id}.txt`);

  try {
    const output = execSync(args.command, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });

    const lines = output.split("\n");

    let relevantLines: string[];
    if (args.search_pattern) {
      const pattern = new RegExp(args.search_pattern, "i");
      relevantLines = lines.filter(l => pattern.test(l));
      if (relevantLines.length === 0) {
        return {
          content: [{ type: "text", text: `No lines matched pattern "${args.search_pattern}" in command output.` }],
          details: { command: args.command, pattern: args.search_pattern },
        };
      }
    } else {
      relevantLines = lines.slice(0, maxLines);
    }

    const result = relevantLines.join("\n");
    writeFileSync(outputFile, result, "utf-8");
    checkSandboxSize();

    return {
      content: [{
        type: "text",
        text: args.search_pattern
          ? `✅ Extracted ${relevantLines.length} matching lines from command output\n📁 Saved to: ${outputFile}\n🔍 Pattern: ${args.search_pattern}`
          : `✅ Output saved to sandbox (${lines.length} lines → ${relevantLines.length} lines kept)\n📁 Path: ${outputFile}`,
      }],
      details: { id, totalLines: lines.length, kept: relevantLines.length, file: outputFile },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeFileSync(outputFile, `ERROR: ${message}`, "utf-8");
    return {
      content: [{ type: "text", text: `❌ Command failed: ${message}\n📁 Error saved to: ${outputFile}` }],
      details: { error: message, file: outputFile },
      isError: true,
    };
  }
}

function ctxPurge(args: { confirm: boolean }): AgentToolResult {
  if (!args.confirm) {
    return {
      content: [{ type: "text", text: `⚠️ ctx_purge requires confirm=true. Pass confirm=true to delete all sandboxed content.` }],
      isError: true,
    };
  }

  const dir = getEffectiveSandboxDir();
  let deleted = 0;
  let freedBytes = 0;

  function purgeDir(p: string): void {
    try {
      const entries = readdirSync(p);
      for (const entry of entries) {
        const full = join(p, entry);
        const s = statSync(full);
        if (s.isDirectory()) purgeDir(full);
        else {
          try {
            freedBytes += s.size;
            unlinkSync(full);
            deleted++;
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  purgeDir(dir);

  return {
    content: [{
      type: "text",
      text: `🗑️ Sandbox purged\n📁 Deleted: ${deleted} files\n💾 Freed: ${(freedBytes / 1024 / 1024).toFixed(1)} MB`,
    }],
    details: { deleted, freedBytes },
  };
}

// ─── Extension ───────────────────────────────────────────────────────

export default function piContextManager(pi: ExtensionAPI) {
  initSearchDB();

  pi.registerTool({
    name: "ctx_execute",
    label: "Context Execute",
    description: "Run a command and save output to sandbox (not context). Use for any command that may produce large output.",
    parameters: Type.Object({
      command: Type.String({ description: "The shell command to execute" }),
      max_output_lines: Type.Optional(Type.Number({ description: "Maximum lines to keep (default: 1000)" })),
    }),
    promptSnippet: `Use ctx_execute to run commands and save output to sandbox instead of filling context.`,
    execute: (_toolCallId, params) => {
      return ctxExecute(params as Parameters<typeof ctxExecute>[0]);
    },
  });

  pi.registerTool({
    name: "ctx_index",
    label: "Context Index",
    description: "Index a file for full-text search within the sandbox.",
    parameters: Type.Object({
      file_path: Type.String({ description: "Path to the file to index" }),
      label: Type.Optional(Type.String({ description: "Optional human-readable label" })),
    }),
    promptSnippet: `Use ctx_index to make sandboxed content searchable.`,
    execute: (_toolCallId, params) => {
      return ctxIndex(params as Parameters<typeof ctxIndex>[0]);
    },
  });

  pi.registerTool({
    name: "ctx_search",
    label: "Context Search",
    description: "Search within indexed sandbox content using full-text search.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      limit: Type.Optional(Type.Number({ description: "Maximum results (default: 10)" })),
      context_lines: Type.Optional(Type.Number({ description: "Context lines around each match (default: 3)" })),
    }),
    promptSnippet: `Use ctx_search to find content in sandboxed files.`,
    execute: (_toolCallId, params) => {
      return ctxSearch(params as Parameters<typeof ctxSearch>[0]);
    },
  });

  pi.registerTool({
    name: "ctx_execute_file",
    label: "Context Execute File",
    description: "Run a command, save output to file, and optionally extract relevant lines.",
    parameters: Type.Object({
      command: Type.String({ description: "The shell command to execute" }),
      search_pattern: Type.Optional(Type.String({ description: "Optional regex pattern to extract relevant lines" })),
      max_output_lines: Type.Optional(Type.Number({ description: "Maximum lines to keep (default: 1000)" })),
    }),
    promptSnippet: `Use ctx_execute_file for one-shot command execution with optional pattern extraction.`,
    execute: (_toolCallId, params) => {
      return ctxExecuteFile(params as Parameters<typeof ctxExecuteFile>[0]);
    },
  });

  pi.registerTool({
    name: "ctx_purge",
    label: "Context Purge",
    description: "Clear all sandboxed content. Requires confirm=true.",
    parameters: Type.Object({
      confirm: Type.Boolean({ description: "Must be true to execute" }),
    }),
    promptSnippet: `Use ctx_purge to clear all sandboxed content. Requires confirm=true.`,
    execute: (_toolCallId, params) => {
      return ctxPurge(params as Parameters<typeof ctxPurge>[0]);
    },
  });

  pi.registerCommand("context-manager", {
    description: "Context window management tools",
    handler: async (_args, ctx) => {
      const dir = getEffectiveSandboxDir();
      const size = getSandboxSizeBytes();
      const files = countFiles(dir);

      ctx.ui.notify(
        `Context Manager: ${files} files, ${(size / 1024 / 1024).toFixed(1)} MB in ${dir}\n` +
        `Tools: ctx_execute, ctx_index, ctx_search, ctx_execute_file, ctx_purge`,
        "info"
      );
    },
  });
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) count += countFiles(full);
      else count++;
    }
  } catch { /* skip */ }
  return count;
}
