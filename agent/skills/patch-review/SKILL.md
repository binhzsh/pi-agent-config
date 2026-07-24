---
name: patch-review
description: |-
  Review a git diff or patch for correctness, safety, and completeness.
  Checks for regressions, missing tests, error handling gaps, security issues,
  and style violations. Produces a structured review with severity ratings.
  Use proactively before merging a PR, after generating a large diff, or when
  asked to review changes.

  Examples:
  - user: "Review this diff" → analyze changes and produce structured review
  - user: "Is this PR safe to merge?" → check for regressions and risks
  - user: "Review my changes" → full patch review with severity ratings
  - user: "Any issues with this patch?" → scan for bugs, security, style
---

# Patch Review

Review a git diff or patch for correctness, safety, and completeness. Produce a
structured review with severity ratings.

## Purpose

Catch regressions, security issues, missing tests, and quality gaps before code
is merged. Every review is grounded in the actual diff — no speculation about
unchanged code.

## When to Use

- Before merging a pull request
- After generating a large set of changes
- When asked to review someone's changes
- Before committing to shared branches

## Inputs

- A git diff (from `git diff`, `git diff HEAD`, `git show`, or pasted patch)
- Optionally: the target branch, relevant context files

## Outputs

- Structured review with findings grouped by severity (P0–P3)
- Inline comments on specific lines when applicable
- Summary with merge recommendation

## Safety Constraints

- Read-only operation — never modifies files or runs commands
- Reviews only changed lines — does not speculate about unchanged code
- Does not execute the diff or apply it
- Flags security issues but does not attempt to exploit them

## Workflow

1. **Capture the diff** — obtain the patch via `git diff`, `git diff HEAD`, or user input
2. **Classify changes** — categorize each hunk (feature, fix, refactor, docs, config, test)
3. **Check correctness** — logic errors, type mismatches, off-by-one, null handling
4. **Check safety** — security issues, data leaks, privilege escalation, injection
5. **Check completeness** — missing tests, unhandled errors, incomplete refactors
6. **Check quality** — style violations, naming, complexity, duplication
7. **Produce review** — structured output with severity ratings and line references

## Review Dimensions

### 1. Correctness

| Check | What to look for |
|---|---|
| Logic errors | Incorrect conditions, wrong operators, inverted booleans |
| Type safety | Mismatched types, unsafe casts, missing type guards |
| Null/undefined | Missing null checks, optional chaining gaps |
| Off-by-one | Array bounds, loop limits, range endpoints |
| Race conditions | Shared state without locks, async without await |
| Resource leaks | Unclosed files, connections, streams, handles |

### 2. Safety

| Check | What to look for |
|---|---|
| Injection | SQL, command, template, path traversal injection |
| Secrets | Hardcoded credentials, API keys, tokens in source |
| AuthZ | Missing authorization checks on new endpoints |
| Data exposure | Overly verbose error messages, debug info in prod |
| Dependency | New packages with known CVEs or low maintenance |
| Permissions | Overly broad file/ directory permissions |

### 3. Completeness

| Check | What to look for |
|---|---|
| Tests | New code without tests; modified code with updated tests |
| Error handling | Unhandled exceptions, swallowed errors, missing fallbacks |
| Edge cases | Empty inputs, large inputs, concurrent access, timeouts |
| Docs | Updated docs for changed APIs, new env vars, config options |
| Migrations | DB schema changes without migration files |
| Config | New settings without defaults or documentation |

### 4. Quality

| Check | What to look for |
|---|---|
| Naming | Clear, consistent names; no abbreviations |
| Complexity | Functions under 40 lines; cyclomatic complexity reasonable |
| Duplication | Copy-pasted code that should be extracted |
| Style | Consistent with project conventions |
| Imports | No unused imports; no circular dependencies |
| Comments | Explains why, not what; no stale comments |

## Severity Ratings

| Severity | Label | Merge Impact |
|---|---|---|
| **P0** | Blocking | Must fix before merge. Security flaw, data loss, crash. |
| **P1** | Required | Should fix before merge. Regression, missing test, correctness bug. |
| **P2** | Recommended | Fix in follow-up. Style issue, minor improvement, docs gap. |
| **P3** | Nit | Optional. Formatting, naming preference, cosmetic. |

## Output Template

```markdown
## Patch Review

> Reviewed: [N] files, [N] insertions, [N] deletions

### Summary
[One-paragraph overview of the changes and overall assessment.]

**Recommendation:** [Merge / Merge with fixes / Do not merge]

### Findings

#### P0 — Blocking
- [ ] `[file:line]` [issue description] — [explanation and fix suggestion]

#### P1 — Required
- [ ] `[file:line]` [issue description] — [explanation and fix suggestion]

#### P2 — Recommended
- [ ] `[file:line]` [issue description] — [explanation]

#### P3 — Nit
- [ ] `[file:line]` [issue description]

### Change Classification
| Category | Files | Lines |
|---|---|---|
| Feature | N | +N |
| Fix | N | +N/-N |
| Refactor | N | +N/-N |
| Test | N | +N |
| Docs | N | +N |
| Config | N | +N/-N |

### Checklist
- [ ] Tests added/updated for new logic
- [ ] Error handling covers edge cases
- [ ] No secrets or credentials in diff
- [ ] Docs updated for API changes
- [ ] No unused imports or dead code
- [ ] Style consistent with project

**Total findings:** P0: N | P1: N | P2: N | P3: N
```

## Rules

- **Review the diff, not the file** — focus on changed lines; use unchanged code only for context
- **Be specific** — cite file paths and line numbers for every finding
- **One finding per item** — do not bundle multiple issues
- **Suggest fixes** — every P0/P1 finding includes a concrete fix suggestion
- **Classify changes** — always include the change classification table
- **Give a recommendation** — always conclude with Merge / Merge with fixes / Do not merge
- **No style nitstorms** — limit P3 findings to 3 maximum; focus on substance
- **Flag missing tests** — new logic without tests is always at least P1
