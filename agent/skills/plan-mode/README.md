# plan-mode — Lightweight Plan Mode for Pi

Lightweight structured execution for medium-complexity tasks. Not as heavy as
OpenSpec, not as loose as "just do it."

## When to use

- Task touches 3+ files or 2+ subsystems
- User says "plan this out" or "do this systematically"
- Work could take more than 10 minutes
- User might get interrupted mid-task

## Usage

```
/plan <description>     → create plan and start executing
/plan continue          → resume the most recent paused plan
/plan list              → list all active/paused plans
/plan show <name>       → show a specific plan
/plan finish            → complete remaining tasks and clean up
/plan pause             → pause the current plan
/plan cancel <name>     → delete a plan without completing it
```

## How it works

Plans live in `.pi/plan-<name>.md` in the project root:

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

## Key differences from spec-driven dev

| Plan Mode | Spec-Driven Dev |
|-----------|----------------|
| `.pi/plan-*.md` files | `openspec/changes/` |
| 3-10 tasks | 8-20+ tasks |
| No delta specs | Full spec files |
| No design docs | Full design docs |
| Quick cleanup | Archive to preserve |
| For medium tasks | For large changes |

## Rules

- Always read the plan file before starting
- One task per response
- Update the file after each task
- Keep tasks small
- Clean up when done
