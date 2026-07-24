---
name: spec-archive
description: |-
  Archive a completed change — sync delta specs to main specs and move the change
  to archive. Use when the user wants to finalize and archive a change after
  implementation is complete.

  Examples:
  - user: "/archive" → archive the active or only change
  - user: "/archive add-dark-mode" → archive that specific change
  - user: "archive this change" → archive the current change
  - user: "finish up this change" → archive after confirming completion
---

# Archive a Completed Change

Archive a completed change: sync delta specs to main specs, then move the change
to the archive directory.

## Input

Optionally specify a change name. If omitted:
- List active changes and let the user select
- Never auto-select — always confirm which change to archive

## Steps

### 1. Get the change name

```bash
ls openspec/changes/ 2>/dev/null | grep -v archive
```

If no name provided, show active changes and ask the user to select.

**IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

### 2. Check artifact completion

```bash
ls openspec/changes/<name>/
```

Check that:
- `proposal.md` exists
- `specs/` directory has spec files
- `design.md` exists
- `tasks.md` exists

**If any artifacts are missing:**
- Display warning listing incomplete artifacts
- Ask the user if they want to proceed anyway

### 3. Check task completion

Read `openspec/changes/<name>/tasks.md` to check for incomplete tasks.

Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

**If incomplete tasks found:**
- Display warning showing count of incomplete tasks
- Ask the user if they want to proceed anyway

**If no tasks file exists:** Proceed without task-related warning.

### 4. Sync delta specs to main specs

For each delta spec in `openspec/changes/<name>/specs/<capability>/spec.md`:

1. **Read the delta spec**
2. **Read or create the main spec** at `openspec/specs/<capability>/spec.md`
3. **Merge the delta:**
   - **ADDED Requirements**: Append to main spec
   - **MODIFIED Requirements**: Replace matching requirement in main spec
   - **REMOVED Requirements**: Remove from main spec
   - **RENAMED Requirements**: Move from old name to new name

**Merge rules:**
- If `openspec/specs/<capability>/spec.md` doesn't exist, create it with `## Purpose`
  and all ADDED requirements
- For MODIFIED requirements, find the matching `### Requirement:` header (whitespace-insensitive)
  and replace the entire block
- For REMOVED requirements, delete the matching requirement block
- Preserve scenarios and structure of existing requirements

### 5. Move change to archive

Create the archive directory if it doesn't exist:

```bash
mkdir -p openspec/changes/archive
```

Generate the target name:
- If the change name already starts with `YYYY-MM-DD-`, use it as-is
- Otherwise, prepend the current date: `YYYY-MM-DD-<change-name>`

Check if target already exists — if yes, suggest renaming.

```bash
mv "openspec/changes/<name>" "openspec/changes/archive/YYYY-MM-DD-<name>"
```

### 6. Display summary

Show:
- Change name
- Archive location
- Whether specs were synced
- Any warnings (incomplete artifacts/tasks)

---

## Output On Success

```markdown
## Archive Complete

**Change:** <change-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs

All artifacts complete. All tasks complete.
```

## Output On Success (with warnings)

```markdown
## Archive Complete

**Change:** <change-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs

**Warnings:**
- Archived with 2 incomplete tasks
```

---

## Guardrails

- Always prompt for change selection if not provided
- Don't block archive on warnings — just inform and confirm
- Preserve all files when moving to archive (they move with the directory)
- Show clear summary of what happened
- If delta specs exist, always sync them before archiving
- Never archive while a spec sync is still in progress
- If sync fails, report what differs and stop — don't archive
