---
name: context-manager
description: |-
  Manage context window usage by sandboxing large tool outputs. Triggers on any
  command, read, or tool call that may produce output exceeding ~50 lines or 2KB.
  Provides ctx_execute, ctx_index, ctx_search, ctx_execute_file, and ctx_purge.
  Use proactively whenever output might bloat context.

  Examples:
  - user: "run the tests" → ctx_execute (don't let test output fill context)
  - user: "show me all the errors" → ctx_execute → ctx_search
  - user: "what files are in src/" → ctx_execute (small output, direct is fine)
  - user: "analyze the git log" → ctx_execute → ctx_index → ctx_search
  - user: "find all TODOs in the codebase" → ctx_execute → ctx_search
---

# Context Manager

Manage context window usage by sandboxing large tool outputs, indexing them for
search, and only injecting relevant excerpts into context.

## Philosophy

Every kilobyte of unnecessary context reduces the quality and speed of the
entire session. Default to sandboxing — only use direct output for guaranteed
small results.

## Sandbox Storage

All sandboxed content lives in:
```
~/.pi/agent/context-sandbox/
├── indexed/          # Indexed content files (one per execution)
├── raw/              # Raw command outputs
└── search-index.db   # SQLite FTS5 search index
```

The sandbox is project-scoped when run from a project directory (stored in
`.pi/context-sandbox/`), otherwise global.

## Decision Tree

```
About to run a command / read a file / call a tool?
│
├── Output is guaranteed small (< 50 lines, < 2KB)?
│   └── Use Bash/Read directly
│
├── Output MIGHT be large or you're UNSURE?
│   └── Use ctx_execute or ctx_execute_file
│
├── Need to search the output multiple times?
│   └── ctx_execute → ctx_index → ctx_search
│
├── One-shot extraction (read once, done)?
│   └── ctx_execute_file (saves to file, reads back relevant parts)
│
├── Using Playwright?
│   └── ALWAYS save snapshots to file, then ctx_index or ctx_execute_file
│
├── Processing MCP tool output?
│   ├── Already in context? → Use directly
│   ├── Need to search later? → ctx_execute → ctx_index → ctx_search
│   └── One-shot? → ctx_execute_file
│
└── When uncertain → use context-mode
```

## Bash Whitelist (safe to run directly)

- **File mutations:** `mkdir`, `mv`, `cp`, `rm` (single file), `touch`, `chmod`
- **Git writes:** `git add`, `git commit`, `git push`, `git checkout`, `git branch`, `git merge`
- **Navigation:** `cd`, `pwd`, `which`
- **Process control:** `kill`, `pkill`
- **Package management:** `npm install`, `npm publish`, `pip install`
- **Simple output:** `echo`, `printf`
- **Small queries:** `grep -c`, `wc -l`, `ls` (single directory)

**Everything else → ctx_execute or ctx_execute_file.**

## Tools

### ctx_execute

Run a command and save output to the sandbox instead of returning it directly.

```
ctx_execute(command: string, max_output_lines?: number)
```

- `command`: The shell command to execute
- `max_output_lines`: Maximum lines to keep (default: 1000)
- Returns: Path to saved output file + line count

### ctx_index

Index a file or command output for full-text search.

```
ctx_index(file_path: string, label?: string)
```

- `file_path`: Path to the file to index (sandbox path or absolute)
- `label`: Optional human-readable label for the index entry
- Returns: Index entry ID

### ctx_search

Search within indexed sandbox content.

```
ctx_search(query: string, limit?: number, context_lines?: number)
```

- `query`: Search query (supports basic fuzzy matching)
- `limit`: Maximum results to return (default: 10)
- `context_lines`: Lines of context around each match (default: 3)
- Returns: Matched excerpts with file paths and line numbers

### ctx_execute_file

Run a command, save output to a file, and read back relevant portions.

```
ctx_execute_file(command: string, search_pattern?: string, max_output_lines?: number)
```

- `command`: The shell command to execute
- `search_pattern`: Optional pattern to extract relevant lines
- `max_output_lines`: Maximum lines to keep (default: 1000)
- Returns: Relevant excerpts from the output

### ctx_purge

Clear all sandboxed content.

```
ctx_purge(confirm: boolean)
```

- `confirm`: Must be true to execute
- Returns: Confirmation of purge

## Workflow

### Pattern 1: Execute and Search Later

```
1. ctx_execute("git log --oneline -100")
   → Returns: ~/.pi/agent/context-sandbox/raw/2024-01-15_abc123.txt

2. ctx_index("~/.pi/agent/context-sandbox/raw/2024-01-15_abc123.txt", "git log")

3. ctx_search("authentication", limit=5)
   → Returns: Matched lines from the git log
```

### Pattern 2: Execute and Extract

```
1. ctx_execute_file("npm test 2>&1", search_pattern="FAIL|ERROR|AssertionError")
   → Returns: Only lines containing FAIL, ERROR, or AssertionError
```

### Pattern 3: Large File Analysis

```
1. ctx_execute("cat large-file.log | grep 'error' | tail -50")
   → Returns: Path to saved output

2. ctx_index(path, "error log tail")

3. ctx_search("timeout", context_lines=5)
   → Returns: Timeout-related errors with surrounding context
```

## Rules

- **Default to sandboxing** — When in doubt, use ctx_execute
- **Index for reuse** — If you'll search the output more than once, index it
- **Label clearly** — Use descriptive labels for indexed content
- **Purge when done** — Clear sandbox for completed investigations
- **Don't nest** — Don't ctx_execute a ctx_execute command
- **Respect limits** — Use max_output_lines to prevent oversized sandboxes
- **Project-scoped when possible** — Use `.pi/context-sandbox/` in projects

## Safety Constraints

- Never ctx_execute destructive commands (rm -rf, git push --force, DROP TABLE)
- Never index files containing secrets or credentials
- Always confirm before ctx_purge with confirm=false
- Limit sandbox size: warn if total exceeds 100MB
