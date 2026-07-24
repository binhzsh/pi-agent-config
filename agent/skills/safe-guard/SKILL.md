---
name: safe-guard
description: |-
  Configure and manage protective rules that intercept dangerous commands before
  execution. Blocks rm -rf, git push --force, DROP TABLE, file truncation, and
  other destructive operations. Use when the user wants to configure safety rules
  or review existing guard configurations.

  Examples:
  - user: "Set up safe-guard for this project" → configure project-level rules
  - user: "Block git push --force" → add specific rule
  - user: "What rules are active?" → list current configuration
  - user: "Allow rm -rf on /tmp" → add exception to rules
  - user: "Review safe-guard config" → audit existing rules
---

# Safe Guard

Configure protective rules that intercept dangerous commands before execution.
Prevents real damage from destructive operations.

## How It Works

Safe-guard uses Pi's `before_tool_use` hook to intercept tool calls (Bash, Read)
and check them against a rulebook. Dangerous commands are blocked with a warning
and suggestion for a safer alternative.

## Rulebook Format

Rules are stored in JSON format:

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "block-rm-rf",
      "name": "Block rm -rf",
      "pattern": "rm\\s+-rf\\s+",
      "action": "block",
      "message": "rm -rf is dangerous. Use rm -ri for interactive confirmation or specify exact paths.",
      "scope": "user"
    },
    {
      "id": "block-git-force",
      "name": "Block git push --force",
      "pattern": "git\\s+push\\s+.*--force",
      "action": "block",
      "message": "git push --force overwrites remote history. Use --force-with-lease instead.",
      "scope": "user"
    },
    {
      "id": "block-drop-table",
      "name": "Block DROP TABLE",
      "pattern": "(?i)DROP\\s+TABLE",
      "action": "block",
      "message": "DROP TABLE is destructive. Use DROP TABLE IF EXISTS with explicit confirmation.",
      "scope": "user"
    },
    {
      "id": "block-file-truncation",
      "name": "Block file truncation",
      "pattern": ">\\s+[^>]",
      "action": "block",
      "message": "> file truncates the file. Use >> to append or verify the file path first.",
      "scope": "user"
    }
  ],
  "exceptions": [
    {
      "id": "allow-tmp-rm",
      "name": "Allow rm -rf on /tmp",
      "pattern": "rm\\s+-rf\\s+/tmp/",
      "action": "allow",
      "scope": "user"
    }
  ]
}
```

## Rule Types

| Action | Behavior |
|--------|----------|
| `block` | Command is blocked with a warning message |
| `warn` | Command proceeds but a warning is displayed |
| `require-confirm` | Command requires explicit user confirmation |

## Scope Levels

| Scope | Location | Applies To |
|-------|----------|------------|
| `user` | `~/.pi/agent/safe-guard/rules.json` | All projects |
| `project` | `.pi/safe-guard/rules.json` | Current project only |

## Configuration Workflow

### 1. Check Existing Configuration

```bash
cat ~/.pi/agent/safe-guard/rules.json 2>/dev/null
cat .pi/safe-guard/rules.json 2>/dev/null
```

### 2. Add a Rule

```bash
# Create/update the rulebook with a new rule
# Rule format: { id, name, pattern, action, message, scope }
```

### 3. Add an Exception

```bash
# Add an exception to allow a previously blocked command
# Exception format: { id, name, pattern, action: "allow", scope }
```

### 4. Test Rules

```bash
# Verify the rulebook is valid JSON with correct schema
# Run: node -e "JSON.parse(require('fs').readFileSync('rules.json', 'utf8'))"
```

## Built-in Default Rules

When no custom rulebook exists, apply these defaults:

1. **Block `rm -rf`** — Suggest `rm -ri` or explicit paths
2. **Block `git push --force`** — Suggest `--force-with-lease`
3. **Block `DROP TABLE`** — Suggest `DROP TABLE IF EXISTS`
4. **Block `> file`** (truncation) — Suggest `>>` for append
5. **Warn on `chmod 777`** — Suggest specific permissions
6. **Warn on `curl ... | sh`** — Suggest downloading first
7. **Warn on `eval`** — Suggest safer alternatives
8. **Warn on `sudo rm`** — Suggest checking path first

## Rules

- **Rules are regex patterns** — Test patterns before adding
- **Exceptions override rules** — More specific patterns should be exceptions
- **Scope matters** — User rules apply everywhere; project rules are local
- **Never auto-allow** — Exceptions require explicit user approval
- **Log blocked commands** — Track what was blocked for review
- **Keep rules minimal** — Only block genuinely dangerous operations
- **Document exceptions** — Every exception should have a clear reason

## Safety Constraints

- Never add an exception that blocks a safety rule
- Never allow `rm -rf /` or `rm -rf /*`
- Never allow `git push --force --force` (double force)
- Always require user confirmation before adding exceptions
- Never modify user-level rules without explicit permission
