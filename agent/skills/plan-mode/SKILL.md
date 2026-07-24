---
name: plan-mode
description: |-
  Lightweight plan mode for medium-complexity tasks. Creates a task list, works
  through it step by step, checks off completed tasks, and cleans up when done.
  If interrupted, the plan persists to disk so work can resume later. Use when the
  user wants structured execution without the overhead of full spec-driven dev.

  Examples:
  - user: "/plan set up CI" → create plan, start executing
  - user: "/plan migrate to TypeScript" → scaffold plan, begin
  - user: "/plan continue" → resume the active plan
  - user: "/plan finish" → complete remaining tasks, clean up
---

# Plan Mode

Lightweight structured execution for medium-complexity tasks. Not as heavy as
OpenSpec, not as loose as "just do it."

## When to use

- Task touches 3+ files or 2+ subsystems
- User says "plan this out" or "do this systematically"
- Work could take more than 10 minutes
- User might get interrupted mid-task

## When NOT to use

- Single file, obvious fix
- User says "just do it"
- Task fits in one response

## The Plan File

Plans live in `.pi/plan-<name>.md` in the project root. Each plan is a self-contained
document that the model reads at the start and writes to as work progresses.

### Plan file format

```markdown
# Plan: <short name>

**Created:** YYYY-MM-DD HH:MM
**Status:** active | paused | done
**Started:** YYYY-MM-DD HH:MM

## Goal

<!-- One sentence: what does "done" look like? -->

## Tasks

- [ ] 1. <Task description>
- [ ] 2. <Task description>
- [ ] 3. <Task description>

## Notes

<!-- Context, decisions, blockers. Updated as work progresses. -->

## Completed: YYYY-MM-DD HH:MM
<!-- Timestamp when plan was finished -->
```

## Workflow

### 1. Create the plan

When the user invokes `/plan <description>`:

1. **Understand the task** — ask clarifying questions if the scope is unclear
2. **Read the plan file** if one exists for this task (resume)
3. **Create a new plan file** at `.pi/plan-<name>.md` if it doesn't exist
4. **Write the goal** — one sentence describing what "done" looks like
5. **Break into tasks** — 3 to 10 tasks, each small enough to complete in one pass
6. **Show the plan** — display it to the user for confirmation
7. **Start executing** — begin with task 1

### 2. Execute tasks

For each task:

1. **Read the plan file** — always start from the file, not from memory
2. **Show which task you're on** — "Working on task 2/5: ..."
3. **Do the work** — make the changes
4. **Check off the task** — mark `- [ ]` as `- [x]`
5. **Update notes** — add any relevant context, decisions, or blockers
6. **Save the plan file**
7. **Move to the next task**

### 3. Handle interruptions

If interrupted (session ends, model context clears, etc.):

1. **The plan file persists** — it's on disk, survives across sessions
2. **On resume, read the plan file first** — before doing anything else
3. **Show current progress** — "Resuming plan: 3/5 tasks done"
4. **Continue from where you left off** — don't redo completed work

### 4. Finish the plan

When all tasks are checked off:

1. **Verify the goal** — does the completed work match the goal?
2. **Add a completion timestamp** — `## Completed: YYYY-MM-DD HH:MM`
3. **Update status** — change `active` to `done`
4. **Clean up** — remove the plan file (it's no longer needed)
5. **Confirm to the user** — "Plan complete. All 5 tasks done."

### 5. Pause the plan

If the user wants to pause:

1. **Update status** — change `active` to `paused`
2. **Add a pause note** — "Paused at task 3/5: ..."
3. **Keep the file** — it will be resumed later

## Commands

| Command | Action |
|---------|--------|
| `/plan <description>` | Create a new plan and start executing |
| `/plan continue` | Resume the most recent paused plan |
| `/plan list` | List all active/paused plans |
| `/plan show <name>` | Show a specific plan |
| `/plan finish` | Complete remaining tasks and clean up |
| `/plan pause` | Pause the current plan |
| `/plan cancel <name>` | Delete a plan without completing it |

## Rules

- **Always read the plan file before starting** — never rely on memory
- **One task per response** — don't rush through multiple tasks
- **Update the file after each task** — the file is the source of truth
- **Keep tasks small** — if a task could be split, split it
- **Add notes as you go** — context decays, notes persist
- **Clean up when done** — delete the plan file after completion
- **Don't over-plan** — 3-10 tasks is the sweet spot. More means break it down.

## Example

User: `/plan add user authentication`

Agent creates `.pi/plan-auth.md`:

```markdown
# Plan: user authentication

**Created:** 2025-01-15 14:30
**Status:** active
**Started:** 2025-01-15 14:30

## Goal

Add JWT-based authentication to the API with login, register, and protected routes.

## Tasks

- [ ] 1. Install jsonwebtoken and bcrypt packages
- [ ] 2. Create auth middleware (verifyToken)
- [ ] 3. Create login endpoint (POST /api/auth/login)
- [ ] 4. Create register endpoint (POST /api/auth/register)
- [ ] 5. Protect existing routes with middleware
- [ ] 6. Add tests for auth endpoints
- [ ] 7. Update API documentation

## Notes

Using JWT with refresh tokens stored in httpOnly cookies.
```

Then executes task 1, checks it off, updates the file, and continues.
