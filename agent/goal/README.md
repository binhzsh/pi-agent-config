# pi-goal-custom

Zero-dependency persistent goal tracking for pi. Fully custom replacement for `npm:pi-agent-goal`.

## Features

- **Persistent goal state** — survives compaction, fork, and session restore via session entries
- **Event-sourced state machine** — create, edit, pause, resume, complete, clear, progress tracking
- **Automatic context injection** — active goal injected into system prompt for every turn
- **Doc import** — import goals from markdown files (extracts objective, criteria, constraints)
- **Goal drafting** — structured proposal with interactive review and edit
- **Zero external dependencies** — pure TypeScript, no pi-tui, no typebox

## Commands

```
/goal                           Show current goal or help
/goal <objective>               Create a new goal (draft mode)
/goal <objective> --replace     Replace existing goal
/goal status                    Show full goal details
/goal edit                      Edit objective/criteria interactively
/goal pause                     Pause the active goal
/goal resume [--start]          Resume a paused goal
/goal start                     Start working on the active goal
/goal complete [--yes]          Mark goal complete
/goal clear [--yes]             Clear the current goal
/goal import <path> [--yes]     Import docs to create/update a goal
```

## Tools

| Tool | Description |
|------|-------------|
| `get_goal` | Get the current long-running goal state and source paths |
| `create_goal` | Create a goal (requires explicit authorization) |
| `propose_goal_draft` | Open a structured goal draft for user review |
| `complete_goal` | Mark the active goal complete with evidence |
| `update_goal_progress` | Update execution progress without changing objective |

## State Machine

```
                    ┌─────────┐
                    │  null   │
                    └────┬────┘
                         │ create/replace
                    ┌────▼────┐
               ┌────┤ active  ├────┐
               │      └────┬────┘    │
               │ pause     │         │ complete
               │           │         │
          ┌────▼────┐      │         │
          │ paused   │◄─────┘         │
          └────┬────┘                 │
               │ resume              │
          ┌────▼────┐                 │
          │  null   │◄────────────────┘
          │ (clear) │
          └─────────┘
```

## Persistence

State is stored as `custom` session entries with type `goal-state`. Each entry contains:
- `action`: The state transition (create, edit, pause, resume, clear, complete, progress, import-docs)
- `state`: The resulting GoalState snapshot (for replay)
- `event`: The event that caused the transition

On load, the state machine replays all events from the session branch to reconstruct the current goal state.

## Architecture

```
index.ts          Main extension — tools, commands, context injection, state machine
goal.test.ts      43 tests across 7 suites (state machine, persistence, commands, parsing, integration)
```

## Tests

```bash
cd /Users/binh/.pi/agent/extensions/goal
npx tsx --test goal.test.ts
```

43 tests, 7 suites, all passing.
