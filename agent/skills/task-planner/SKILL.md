---
name: task-planner
description: |-
  Turn a coding request into a short implementation plan before making changes.
  Defines scope, affected files, assumptions, risks, test strategy, and rollback
  plan. Use proactively before any non-trivial edit, refactor, feature addition,
  or architectural change. Skip only for trivial one-line fixes.

  Examples:
  - user: "Add user authentication" → plan scope, files, risks, tests
  - user: "Refactor the payment module" → identify blast radius and rollback
  - user: "Migrate from REST to GraphQL" → phased plan with assumptions
  - user: "Add rate limiting to the API" → lightweight plan with test strategy
---

# Task Planner

Before implementing any change, produce a plan. Follow these rules strictly.

## Purpose

Prevent scope creep, reduce rework, and ensure every change has a rollback path.

## When to Use

**Always plan** when the request involves:
- Adding a new feature
- Refactoring existing code
- Changing public APIs or interfaces
- Modifying shared utilities or base classes
- Touching more than 3 files
- Introducing new dependencies

**Skip planning** for:
- Typos, formatting, lint fixes
- Single-file, single-function edits with clear intent
- Renaming within a single file

## Inputs

- A coding request (feature, refactor, bug fix, migration)
- Current codebase context (files, architecture)

## Outputs

- Inline plan (10–20 lines) with scope, files, assumptions, risks, tests, rollback

## Safety Constraints

- Never modifies files during planning — plan is read-only
- Flags unknowns explicitly rather than assuming
- Requires rollback path for every plan

## Workflow

1. **Clarify** — restate the goal in one sentence; ask at most one clarifying question
2. **Scope** — define what is in scope and explicitly out of scope
3. **Affected files** — list files to read, create, modify, or delete
4. **Assumptions** — state any assumptions about the codebase, APIs, or environment
5. **Risks** — identify blast radius, breaking changes, data migration needs
6. **Test strategy** — what to test, at what level, how to verify
7. **Rollback plan** — how to undo if something breaks
8. **Execute** — implement step by step, following the plan

## Plan Template

Output the plan inline (no separate file):

```
## Plan: [one-line summary]

**Scope:** [what's in] / [what's out]

**Files:**
| Action | Path | Reason |
|---|---|---|
| read | `src/config.ts` | understand current config shape |
| modify | `src/auth.ts` | add middleware |
| create | `src/middleware/rate-limit.ts` | new rate limiter |

**Assumptions:**
- [assumption 1]
- [assumption 2]

**Risks:**
- [risk] → [mitigation]

**Tests:**
- [test case or strategy]

**Rollback:**
- [how to undo, e.g. "git revert", "feature flag off", "DB migration downgrade"]
```

## Execution After Planning

1. Confirm the plan with the user (or proceed if straightforward)
2. Execute each step in order
3. Run relevant tests after each phase
4. If the plan proves wrong mid-execution, stop, update the plan, continue
5. On completion, verify against the original goal and note deviations

## Rules

- **Be brief** — 10–20 lines total, checklist not spec doc
- **Be concrete** — name actual files, not abstract "the auth module"
- **Verify before modifying** — read files listed as `read` or `modify` first
- **Flag unknowns** — state as assumption or risk if unconfirmed
- **One change at a time** — group into phases if many files touched
- **No silent assumptions** — every assumption must be explicit
- **Tests first mindset** — note existing tests that must still pass
- **Rollback is mandatory** — every plan includes a rollback path
