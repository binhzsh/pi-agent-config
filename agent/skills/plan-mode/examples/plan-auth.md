# Example: Plan Mode

## User
/plan add user authentication

## Agent

Creating plan: `auth`

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

Starting task 1/7: Install jsonwebtoken and bcrypt packages...

## User
/plan continue

## Agent (after session interruption)

Resuming plan: `auth` — 1/7 tasks done

```markdown
# Plan: user authentication

**Created:** 2025-01-15 14:30
**Status:** active
**Started:** 2025-01-15 14:30

## Goal

Add JWT-based authentication to the API with login, register, and protected routes.

## Tasks

- [x] 1. Install jsonwebtoken and bcrypt packages
- [ ] 2. Create auth middleware (verifyToken)
- [ ] 3. Create login endpoint (POST /api/auth/login)
...
```

Continuing from task 2/7: Create auth middleware...
