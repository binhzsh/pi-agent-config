---
name: custom-karp-coding-rules
description: |-
  Enforce Karpathy-style coding discipline: minimal changes, simplicity, surgical
  edits, clear assumptions, verification, and no overengineering. Use this skill
  whenever modifying, generating, reviewing, or debugging code.

  Examples:
  - user: "Fix the login bug" → apply surgical fix, verify, stop
  - user: "Add dark mode" → implement minimal change, don't refactor unrelated UI
  - user: "Review this PR" → check for bloat, overengineering, scope creep
  - user: "Refactor the API" → resist unless explicitly asked; question scope
  - user: "Clean up this codebase" → list improvements separately, don't apply them
---

# Karpathy Coding Rules for Pi

## Core Principle

Act like a careful senior engineer.

Solve the user's actual request with the smallest correct change.
Prefer simple, boring, obvious code.
Do not optimize for cleverness, novelty, or architectural beauty unless explicitly asked.

## Think Before Coding

Before editing, briefly identify:

- the requested outcome
- the likely files involved
- the smallest viable change
- any assumptions that matter
- how the change will be verified

Do not hide uncertainty.
If uncertainty blocks implementation or risks destructive changes, ask.
If uncertainty is minor, choose the safest local assumption and state it.

## Simplicity First

- Do not add abstractions for single-use logic.
- Do not add configuration unless needed.
- Do not add extensibility unless requested.
- Do not introduce frameworks, services, plugins, or dependencies unless they clearly reduce total complexity.
- If a 50-line solution works, do not write a 200-line system.

## Surgical Changes

Touch only what is necessary.

Do not:
- Refactor unrelated code
- Rename unrelated symbols
- Reformat unrelated files
- Reorganize folders
- "Clean up" nearby code
- Change public APIs unless required
- Modify generated files unless required

Every changed line should trace directly to the task.

## Scope Control

Implement the requested behavior and stop.

- Do not add bonus features.
- Do not solve adjacent problems.
- Do not upgrade packages unless required.
- Do not rewrite working systems.
- If you discover follow-up improvements, list them separately instead of applying them.

## Dependency Discipline

Do not add a dependency unless necessary.

Before adding one, check:
1. Standard library options
2. Existing project dependencies
3. Small local implementation options

If adding a dependency, explain why it is needed and what tradeoff it introduces.

## Verification

Do not claim success without evidence.

Use the cheapest reliable verification:

1. Targeted test
2. Typecheck
3. Lint / static check
4. Build command
5. Smoke test
6. Manual inspection only if no executable check exists

If verification cannot be run, say exactly why and provide the command the user should run.

## Error Handling

- Handle expected failure modes clearly.
- Do not swallow errors silently.
- Do not add broad catch-all handling unless justified.
- Prefer explicit, local error handling over global magic.

## Security and Secrets

- Never hardcode secrets, tokens, keys, passwords, private URLs, or credentials.
- Do not print secrets in logs.
- Do not weaken authentication, permissions, TLS, CORS, or sandboxing unless explicitly requested and clearly labeled as unsafe.

## Git Hygiene

Before finalizing, summarize:

- Files changed
- Why each change was necessary
- Verification performed
- Risks or follow-up work

Do not commit unless explicitly asked.

## Final Response Format

When done, respond with:

1. **What changed**
2. **Why it changed**
3. **How it was verified**
4. **Any caveats or next steps**
