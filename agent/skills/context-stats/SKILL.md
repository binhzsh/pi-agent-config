---
name: context-stats
description: |-
  Show context window usage statistics for the current session. Displays token
  consumption, context savings from sandboxing, and per-tool breakdown.
  Read-only — shows stats only, no reset capability. Use when the user wants to
  see context usage, check if they're running low, or understand where context
  is being spent.

  Examples:
  - user: "How much context am I using?" → show current stats
  - user: "context stats" → show current stats
  - user: "Where is my context going?" → per-tool breakdown
  - user: "How much did sandboxing save?" → savings analysis
  - user: "Am I running low on context?" → remaining context check
---

# Context Stats

Show context window usage statistics for the current session.

## What It Tracks

- **Total tokens consumed** (input + output) this session
- **Context window utilization** — percentage of available context used
- **Savings from sandboxing** — estimated tokens saved by using context-manager
- **Per-tool breakdown** — which tools are consuming the most context
- **Session timeline** — context usage over time

## Data Sources

Context stats are collected from:

1. **Pi's built-in token tracking** — via the `pi-status` extension
2. **Context sandbox logs** — from `~/.pi/agent/context-sandbox/` or `.pi/context-sandbox/`
3. **Session entries** — Pi stores token counts in session metadata

## Commands

### /context-stats

Show a summary of context usage:

```
┌─────────────────────────────────────────┐
│ Context Window Usage                    │
├─────────────────────────────────────────┤
│ Total tokens:     45,230 / 262,144      │
│ Utilization:      17.3%                 │
│ Estimated saved:  12,400 tokens (21.5%) │
│ Remaining:        216,914 tokens        │
├─────────────────────────────────────────┤
│ Per-Tool Breakdown                      │
│ Bash:           18,200 (40.2%)          │
│ Read:           12,400 (27.4%)          │
│ Edit:            8,100 (17.9%)          │
│ Write:           4,300 (9.5%)           │
│ Other:           2,230 (4.9%)           │
└─────────────────────────────────────────┘
```

### /context-stats --detailed

Show detailed per-message breakdown:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Detailed Breakdown                                                  │
├──────────┬──────────┬──────────┬──────────────────────────────────┤
│ Message  │ Tokens   │ Tool     │ Summary                          │
├──────────┼──────────┼──────────┼──────────────────────────────────┤
│ #1       │ 2,100    │ Bash     │ git log --oneline -100           │
│ #2       │ 1,800    │ Read     │ src/auth.ts                      │
│ #3       │ 3,200    │ Bash     │ npm test 2>&1                    │
│ ...      │ ...      │ ...      │ ...                              │
└──────────┴──────────┴──────────┴──────────────────────────────────┘
```

### /context-stats --savings

Show context savings from sandboxing:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Context Savings Analysis                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Commands sandboxed:     12                                          │
│ Tokens saved:          12,400                                       │
│ Savings rate:          21.5%                                        │
│ Largest save:          4,200 tokens (npm test output)               │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow

### Show Current Stats

1. Check for existing context-sandbox directory
2. Read session token counts from Pi's state
3. Calculate utilization percentage
4. Format and display results

### Detailed Breakdown

1. Parse session entries for per-message token counts
2. Group by tool used
3. Sort by token count (descending)
4. Display top entries

### Savings Analysis

1. Count ctx_execute/ctx_execute_file calls from sandbox logs
2. Estimate tokens that would have been consumed without sandboxing
3. Calculate savings percentage

## Rules

- **Read-only** — Never modify session data
- **Be approximate** — Token counts are estimates unless from Pi's native tracking
- **Be concise** — Summary format by default; detailed on request
- **No reset** — This skill shows stats only; it doesn't clear context
- **Context-aware** — Adjust recommendations based on current utilization:
  - < 50%: No action needed
  - 50-75%: Consider sandboxing large outputs
  - 75-90%: Actively use context-manager for all non-trivial outputs
  - > 90%: Strongly recommend ctx_purge and context-manager usage
