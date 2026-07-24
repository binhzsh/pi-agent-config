---
name: spec-apply
description: |-
  Implement tasks from a spec-driven change. Use when the user wants to start
  implementing, continue implementation, or work through tasks from a proposed change.

  Examples:
  - user: "/apply" → implement tasks from the active or only change
  - user: "/apply add-dark-mode" → implement tasks from that specific change
  - user: "continue implementing" → resume work on the current change
  - user: "implement the remaining tasks" → work through pending tasks
---

# Apply — Implement Tasks

Implement tasks from a spec-driven change, marking them complete as you go.

## Input

Optionally specify a change name. If omitted:
- Infer from conversation context if the user mentioned a change
- Auto-select if only one active change exists
- If ambiguous, list available changes and let the user select

## Steps

### 1. Select the change

If a name is provided, use it. Otherwise:

```bash
ls openspec/changes/ 2>/dev/null | grep -v archive | head -20
```

If only one active change exists, use it. If multiple, ask the user to choose.

Always announce: "Using change: <name>" and how to override (e.g., `/spec-apply <other>`).

### 2. Check change status

```bash
cat openspec/changes/<name>/.openspec.yaml 2>/dev/null
ls openspec/changes/<name>/ 2>/dev/null
```

Verify:
- The change directory exists
- Required artifacts exist (proposal, specs, design, tasks)
- The schema is spec-driven

**If tasks.md is missing:** The change isn't ready for implementation. Suggest
running `/propose` first, or ask the user if they want to create tasks manually.

### 3. Read all context files

Read every artifact in order:

1. `openspec/changes/<name>/proposal.md` — why we're building this
2. `openspec/changes/<name>/specs/**/*.md` — what the system must do
3. `openspec/changes/<name>/design.md` — how to implement
4. `openspec/changes/<name>/tasks.md` — the implementation checklist
5. `openspec/config.yaml` — project context and rules

### 6. Show current progress

Display:
- Change name
- Progress: "N/M tasks complete"
- Remaining tasks overview

### 5. Implement tasks (loop until done or blocked)

For each pending task:
1. Show which task is being worked on
2. Make the code changes required
3. Keep changes minimal and focused
4. Mark task complete in tasks.md: `- [ ]` → `- [x]`
5. Continue to next task

**Pause if:**
- Task is unclear → ask for clarification
- Implementation reveals a design issue → suggest updating artifacts
- Error or blocker encountered → report and wait for guidance
- User interrupts

### 6. On completion or pause, show status

Display:
- Tasks completed this session
- Overall progress: "N/M tasks complete"
- If all done: suggest archive
- If paused: explain why and wait for guidance

---

## Output During Implementation

```
## Implementing: <change-name>

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

## Output On Completion

```
## Implementation Complete

**Change:** <change-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change with `/archive`.
```

## Output On Pause (Issue Encountered)

```
## Implementation Paused

**Change:** <change-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

---

## Guardrails

- Keep going through tasks until done or blocked
- Always read all context files before starting
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Don't skip tasks — work through them in order
- If a task requires changes to specs or design, suggest updating those artifacts first
