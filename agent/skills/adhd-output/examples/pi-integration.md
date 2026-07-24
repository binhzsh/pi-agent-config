# Pi Integration Examples

## With spec-workflow

### User
/adhd /propose add-dark-mode

### Agent (ADHD mode)

> Creating change: `add-dark-mode`
>
> 1. Scaffold `openspec/changes/add-dark-mode/`
> 2. Generate `proposal.md` — dark mode for all components
> 3. Generate `specs/theme-selection/spec.md` — toggle, persistence, system pref
> 4. Generate `design.md` — Tailwind `dark:` strategy
> 5. Generate `tasks.md` — 8 tasks
>
> All artifacts created. Next: `/apply` to start implementing.

---

## With graphify

### User
/adhd /explore how the auth system works

### Agent (ADHD mode)

> Running graphify to map auth architecture...
>
> **Auth flow:**
> ```
> request → middleware/verify.ts → routes/
>                    ↓
>              utils/jwt.ts (sign/verify)
>                    ↓
>              models/user.ts
> ```
>
> **Key files:**
> 1. `src/middleware/verify.ts` — token validation entry point
> 2. `src/utils/jwt.ts` — sign/verify helpers
> 3. `src/routes/auth.ts` — login/register endpoints
>
> **Patterns:** JWT in Authorization header, cookies for refresh tokens.
>
> Want me to trace a specific flow?

---

## With task-planner

### User
/adhd /propose refactor database layer

### Agent (ADHD mode)

> Creating change: `refactor-database-layer`
>
> 1. `proposal.md` — replace raw queries with typed client
> 2. `specs/db-client/spec.md` — new database abstraction
> 3. `design.md` — Prisma vs Drizzle tradeoff
> 4. `tasks.md` — 12 tasks (migration-friendly)
>
> Note: 12 tasks, split into 3 batches. About 2 hours total.
>
> Next: `/apply` to start batch 1.
