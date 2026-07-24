---
name: pr-preflight
description: Run deterministic pre-PR checks and summarize merge risk before pushing changes. Use when preparing a branch for review, before opening a pull request, or before requesting CI reruns.
---
# PR Preflight

Execute a fast, deterministic preflight before push/PR.

## Run

1. Run `scripts/preflight.sh` from repo root.
2. Capture failures by step and include exact command + first actionable error.
3. Fix highest-signal failures first (type errors, test failures, lint, formatting).

## Output Contract

Return:
- What passed.
- What failed.
- Whether the branch is ready for PR.
- Recommended next fix in one sentence.

## Guardrails

1. Avoid unrelated refactors during preflight.
2. Do not auto-commit; keep changes reviewable.
3. If checks are unavailable, report the gap explicitly.
