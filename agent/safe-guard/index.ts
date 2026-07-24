/**
 * Safe Guard Extension
 *
 * Intercepts dangerous commands before execution using before_tool_use hook.
 * Blocks rm -rf, git push --force, DROP TABLE, file truncation, and other
 * destructive operations.
 *
 * Zero external dependencies — uses only node:fs, node:path.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { homedir } from "node:os";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

// ─── Types ───────────────────────────────────────────────────────────

interface SafeGuardRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  action: "block" | "warn" | "require-confirm";
  message: string;
  scope: "user" | "project";
}

interface SafeGuardConfig {
  version: string;
  rules: SafeGuardRule[];
  exceptions: SafeGuardRule[];
}

// ─── Default Rules ───────────────────────────────────────────────────

const DEFAULT_RULES: SafeGuardRule[] = [
  {
    id: "block-rm-rf",
    name: "Block rm -rf",
    pattern: /^rm\s+-rf\s+/,
    action: "block",
    message: "⛔ rm -rf is dangerous. Use rm -ri for interactive confirmation or specify exact paths.",
    scope: "user",
  },
  {
    id: "block-git-force",
    name: "Block git push --force",
    pattern: /git\s+push\s+.*--force(?!\s+-with-lease)/,
    action: "block",
    message: "⛔ git push --force overwrites remote history. Use --force-with-lease instead.",
    scope: "user",
  },
  {
    id: "block-drop-table",
    name: "Block DROP TABLE",
    pattern: /DROP\s+TABLE/i,
    action: "block",
    message: "⛔ DROP TABLE is destructive. Use DROP TABLE IF EXISTS with explicit confirmation.",
    scope: "user",
  },
  {
    id: "block-file-truncation",
    name: "Block file truncation",
    pattern: /^>\s+[^>]/,
    action: "block",
    message: "⛔ > file truncates the file. Use >> to append or verify the file path first.",
    scope: "user",
  },
  {
    id: "warn-chmod-777",
    name: "Warn chmod 777",
    pattern: /chmod\s+777\s+/,
    action: "warn",
    message: "⚠️  chmod 777 gives full permissions to everyone. Use specific permissions instead (e.g., 755, 644).",
    scope: "user",
  },
  {
    id: "warn-curl-pipe",
    name: "Warn curl | sh",
    pattern: /curl\s+.*\|\s*(sh|bash|zsh)/,
    action: "warn",
    message: "⚠️  curl | sh is dangerous — you're executing remote code without review. Download first, review, then execute.",
    scope: "user",
  },
  {
    id: "warn-eval",
    name: "Warn eval usage",
    pattern: /\beval\s*\(/,
    action: "warn",
    message: "⚠️  eval() executes arbitrary code. Use JSON.parse() or safer alternatives when possible.",
    scope: "user",
  },
  {
    id: "warn-sudo-rm",
    name: "Warn sudo rm",
    pattern: /sudo\s+rm\s+/,
    action: "warn",
    message: "⚠️  sudo rm runs as root. Double-check the path before proceeding.",
    scope: "user",
  },
];

// ─── Config Loading ──────────────────────────────────────────────────

const GLOBAL_CONFIG_DIR = join(homedir(), ".pi", "agent", "safe-guard");
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, "rules.json");

function ensureConfigDir(): void {
  if (!existsSync(GLOBAL_CONFIG_DIR)) {
    mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): SafeGuardConfig {
  ensureConfigDir();

  if (existsSync(GLOBAL_CONFIG_FILE)) {
    try {
      const data = JSON.parse(readFileSync(GLOBAL_CONFIG_FILE, "utf-8"));
      if (data && data.version === "1.0") {
        // Merge with defaults (user rules override defaults)
        const merged = {
          ...data,
          rules: mergeRules(DEFAULT_RULES, data.rules || []),
          exceptions: data.exceptions || [],
        };
        return merged;
      }
    } catch { /* ignore invalid config */ }
  }

  // Return defaults
  return {
    version: "1.0",
    rules: DEFAULT_RULES,
    exceptions: [],
  };
}

function mergeRules(defaults: SafeGuardRule[], custom: SafeGuardRule[]): SafeGuardRule[] {
  const customIds = new Set(custom.map(r => r.id));
  const merged = [...defaults.filter(d => !customIds.has(d.id))];
  return [...merged, ...custom];
}

function saveConfig(config: SafeGuardConfig): void {
  ensureConfigDir();
  writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ─── Pattern Matching ────────────────────────────────────────────────

function checkCommand(command: string): SafeGuardRule | null {
  const config = loadConfig();

  // Check exceptions first
  for (const exception of config.exceptions) {
    const pattern = typeof exception.pattern === "string"
      ? new RegExp(exception.pattern, exception.pattern.includes("/") ? "i" : "")
      : exception.pattern;
    if (pattern.test(command)) {
      return null; // Exception matched, allow
    }
  }

  // Check rules
  for (const rule of config.rules) {
    const pattern = typeof rule.pattern === "string"
      ? new RegExp(rule.pattern, rule.pattern.includes("/") ? "i" : "")
      : rule.pattern;
    if (pattern.test(command)) {
      return rule;
    }
  }

  return null;
}

// ─── Extension ───────────────────────────────────────────────────────

export default function piSafeGuard(pi: ExtensionAPI) {
  const config = loadConfig();

  // before_tool_use hook to intercept dangerous commands
  pi.on("before_tool_use", async (event) => {
    const toolName = (event as any).tool_name;
    const toolArgs = (event as any).tool_args;

    // Only intercept Bash tool calls
    if (toolName !== "Bash") return;

    const command = typeof toolArgs === "string"
      ? toolArgs
      : toolArgs?.command || toolArgs?.input || "";

    if (!command || typeof command !== "string") return;

    const rule = checkCommand(command);
    if (!rule) return;

    // Handle based on action type
    switch (rule.action) {
      case "block":
        event.preventDefault();
        event.systemPrompt = (event.systemPrompt || "") + `\n\n⛔ SAFE-GUARD BLOCKED: "${rule.name}"\n${rule.message}\nCommand was: ${command}\n`;
        break;

      case "warn":
        // Don't prevent, but add warning to context
        event.systemPrompt = (event.systemPrompt || "") + `\n\n⚠️  SAFE-GUARD WARNING: "${rule.name}"\n${rule.message}\nCommand was: ${command}\n`;
        break;

      case "require-confirm":
        event.systemPrompt = (event.systemPrompt || "") + `\n\n⚠️  SAFE-GUARD REQUIRES CONFIRMATION: "${rule.name}"\n${rule.message}\nCommand was: ${command}\nPlease confirm this is intentional before proceeding.\n`;
        break;
    }
  });

  // Commands for managing safe-guard
  pi.registerCommand("safe-guard", {
    description: "Manage safe-guard rules",
    getArgumentCompletions: (prefix) => {
      const subcommands = ["list", "add", "remove", "allow", "status"];
      return subcommands.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s }));
    },
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const subcommand = parts[0]?.toLowerCase();
      const arg1 = parts[1];

      switch (subcommand) {
        case "list": {
          const config = loadConfig();
          const lines = ["=== Safe-Guard Rules ===", ""];

          lines.push("BLOCK rules:");
          for (const rule of config.rules.filter(r => r.action === "block")) {
            lines.push(`  ⛔ ${rule.name}: ${rule.message}`);
          }

          lines.push("");
          lines.push("WARN rules:");
          for (const rule of config.rules.filter(r => r.action === "warn")) {
            lines.push(`  ⚠️  ${rule.name}: ${rule.message}`);
          }

          lines.push("");
          lines.push("Exceptions:");
          if (config.exceptions.length === 0) {
            lines.push("  (none)");
          } else {
            for (const rule of config.exceptions) {
              lines.push(`  ✅ ${rule.name}: ${rule.message}`);
            }
          }

          lines.push("");
          lines.push(`Config: ${GLOBAL_CONFIG_FILE}`);

          ctx.ui.notify(lines.join("\n"), "info");
          break;
        }

        case "add": {
          if (!arg1) {
            ctx.ui.notify(
              "Usage: /safe-guard add <name> <pattern> <action> <message>\n" +
              "  action: block, warn, require-confirm",
              "warning"
            );
            return;
          }

          const name = arg1;
          const pattern = parts[2] || "";
          const action = (parts[3] || "block") as SafeGuardRule["action"];
          const message = parts.slice(4).join(" ") || "";

          if (!pattern) {
            ctx.ui.notify("Pattern is required.", "warning");
            return;
          }

          const rule: SafeGuardRule = {
            id: `custom-${name.toLowerCase().replace(/\s+/g, "-")}`,
            name,
            pattern,
            action,
            message,
            scope: "user",
          };

          config.rules.push(rule);
          saveConfig(config);
          ctx.ui.notify(`Added rule: ${name} (${action})`, "success");
          break;
        }

        case "remove": {
          if (!arg1) {
            ctx.ui.notify("Usage: /safe-guard remove <rule-id>", "warning");
            return;
          }

          const idx = config.rules.findIndex(r => r.id === arg1);
          if (idx === -1) {
            ctx.ui.notify(`Rule "${arg1}" not found.`, "warning");
            return;
          }

          config.rules.splice(idx, 1);
          saveConfig(config);
          ctx.ui.notify(`Removed rule: ${arg1}`, "info");
          break;
        }

        case "allow": {
          if (!arg1) {
            ctx.ui.notify("Usage: /safe-guard allow <pattern> <name>", "warning");
            return;
          }

          const pattern = arg1;
          const name = parts.slice(2).join(" ") || `exception-${Date.now()}`;

          const exception: SafeGuardRule = {
            id: `exception-${Date.now()}`,
            name,
            pattern,
            action: "block", // Temporarily block to allow
            message: `Exception: ${name}`,
            scope: "user",
          };

          config.exceptions.push(exception);
          saveConfig(config);
          ctx.ui.notify(`Added exception: ${name} (pattern: ${pattern})`, "success");
          break;
        }

        case "status": {
          const config = loadConfig();
          const blockCount = config.rules.filter(r => r.action === "block").length;
          const warnCount = config.rules.filter(r => r.action === "warn").length;
          const exceptionCount = config.exceptions.length;

          ctx.ui.notify(
            `Safe-Guard Status:\n` +
            `  Block rules: ${blockCount}\n` +
            `  Warn rules: ${warnCount}\n` +
            `  Exceptions: ${exceptionCount}\n` +
            `  Config: ${GLOBAL_CONFIG_FILE}`,
            "info"
          );
          break;
        }

        default:
          ctx.ui.notify(
            "Usage: /safe-guard <list|add|remove|allow|status>\n" +
            "  list           - Show all rules\n" +
            "  add <name> <pattern> <action> <message> - Add a rule\n" +
            "  remove <id>    - Remove a rule\n" +
            "  allow <pattern> <name> - Add an exception\n" +
            "  status         - Show status summary",
            "warning"
          );
      }
    },
  });

  // Log initialization
  const blockCount = config.rules.filter(r => r.action === "block").length;
  console.log(`[safe-guard] Initialized with ${blockCount} block rules, ${config.exceptions.length} exceptions`);
}
