# Before / After — ADHD Output

## Example 1: Debugging

### Before (buried answer)

> Great question! Let me think about this. Your auth flow has a few moving pieces:
> the middleware, the token verification, and the cookie handling. Looking at
> `src/auth.ts`, the `verifyToken` function (around lines 42-58) seems to be using
> an older `jsonwebtoken` API. One approach would be to update the package and
> rewrite that function. After making the change, you'd want to run the auth tests
> to confirm nothing breaks. By the way, you might also want to look at your
> dependency versions overall. Hope this helps! Let me know if you want to dig
> deeper.

### After (ADHD output)

> Run `npm install jsonwebtoken@latest`, then edit `src/auth.ts:42`.
>
> 1. Open `src/auth.ts`
> 2. Replace `verifyToken` (lines 42–58) with the snippet below
> 3. Run `npm test -- auth.spec.ts`
>
> Next: paste the first failing line if any test fails.

---

## Example 2: Multi-step task

### Before

> I'd suggest we start by looking at the database schema, then we can update the
> models, and after that we'll need to update the API endpoints. You might also
> want to consider the migration strategy. Let me know which you want to tackle
> first!

### After (ADHD output)

> 1. Run `grep -r "user_id" src/models/` to find all model references
> 2. Update `src/models/user.ts` — change `user_id: number` to `id: string`
> 3. Update `src/models/post.ts` — same pattern
> 4. Run `npm test` to verify
>
> About 20 minutes. Next: paste the first test failure.

---

## Example 3: Error reporting

### Before

> Uh oh, it looks like there might be a problem with your test. It seems like the
> authorization isn't working quite right. There could be a few reasons for this —
> maybe the token isn't being passed correctly, or perhaps the middleware isn't
> configured properly. Let me know if you want me to dig into it further!

### After (ADHD output)

> Test fails at `auth.spec.ts:42`: expected 200, got 401.
>
> Cause: request missing `Authorization` header.
>
> Fix: add `headers: { Authorization: "Bearer ${token}" }` to the test request.
>
> Run `npm test -- auth.spec.ts` to verify.
