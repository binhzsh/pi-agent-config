---
name: smart-test-runner
description: |-
  Detect a project's language and available test commands, then run the smallest
  relevant checks first. Supports Python, Node.js, Docker Compose, Go, Rust,
  Makefile-based projects, and Astro. Never runs destructive commands. Use
  proactively after making code changes, before committing, or when asked to
  verify something works.

  Examples:
  - user: "Run the tests" → detect stack and run lint → type-check → unit tests
  - user: "Does this still work?" → run the fastest relevant checks first
  - user: "CI check" → run full pipeline: lint, type, test, build
  - user: "Quick check" → run only lint and type-check, skip slow tests
---

# Smart Test Runner

Detect the project's test infrastructure and run checks in ascending order of
cost — fastest and most targeted first. Stop on the first failure unless the
user asks for a full run.

## Purpose

Provide fast feedback after code changes without requiring the user to know the
project's test commands. Detect the stack automatically and run safe checks only.

## When to Use

- After making code changes
- Before committing
- When asked to verify something works
- When onboarding to a new project

## Inputs

- A checked-out repository with test infrastructure

## Outputs

- Test report with pass/fail status, timing, and next steps

## Safety Constraints

- Never runs destructive commands (see Forbidden Commands table)
- Never installs packages
- Never pushes, publishes, or deploys
- Never runs database migrations
- Stops on first failure unless `--all` requested
- Respects timeouts per category

## Workflow

1. **Detect** — identify language, package manager, test framework, commands
2. **Classify** — determine available checks (lint, type, test, build, e2e)
3. **Order** — sort by speed: lint → type-check → unit → integration → e2e → build
4. **Run** — execute checks one at a time; stop on first failure
5. **Report** — summarize pass/fail with timing and next steps

## Detection Tables

### Language Detection

| Language | Indicators |
|---|---|
| Python | `pyproject.toml`, `setup.py`, `requirements.txt`, `uv.lock` |
| Node.js | `package.json` |
| TypeScript | `package.json` + `tsconfig.json` |
| Go | `go.mod` |
| Rust | `Cargo.toml` |
| Astro | `astro.config.mjs`, `package.json` with `astro` |
| Docker Compose | `compose.yml`, `docker-compose.yml` |
| Makefile | `Makefile`, `makefile` |

### Test Framework Detection

| Language | Framework | Indicator |
|---|---|---|
| Python | pytest | `pytest.ini`, `pyproject.toml` `[tool.pytest]`, `conftest.py` |
| Node | Jest | `jest.config.*`, `package.json` `"jest"` key |
| Node | Vitest | `vitest.config.*`, `vitest` in deps |
| Node | Mocha | `.mocharc.*`, `mocha` in deps |
| Go | go test | `*_test.go` files |
| Rust | cargo test | `Cargo.toml` + `src/` or `tests/` |
| Astro | vitest/jest | same as Node; check `astro check` for type validation |

### Per-Language Default Commands

#### Python

| Category | Command | Condition |
|---|---|---|
| lint | `ruff check .` | `ruff` in deps or `ruff.toml` exists |
| format | `ruff format --check .` | `ruff` in deps |
| type | `mypy .` | `mypy` in deps |
| unit | `pytest -x --tb=short` | `pytest` in deps or `tests/` exists |

#### Node.js / TypeScript

| Category | Command | Condition |
|---|---|---|
| lint | `npx eslint .` | `eslint` in deps or `eslint.config.*` exists |
| format | `npx prettier --check .` | `prettier` in deps |
| type | `npx tsc --noEmit` | `tsconfig.json` exists |
| unit | `npx vitest run` | `vitest` in deps |
| unit | `npx jest --passWithNoTests` | `jest` in deps |
| build | `npm run build` | `scripts.build` in package.json |

#### Astro

| Category | Command | Condition |
|---|---|---|
| type | `npx astro check` | `astro` in deps |
| build | `npm run build` | `scripts.build` in package.json |

#### Go

| Category | Command | Condition |
|---|---|---|
| lint | `golangci-lint run` | `golangci-lint` available |
| unit | `go test ./...` | `*_test.go` files exist |
| build | `go build ./...` | `go.mod` exists |

#### Rust

| Category | Command | Condition |
|---|---|---|
| lint | `cargo clippy` | `Cargo.toml` exists |
| unit | `cargo test` | `Cargo.toml` exists |
| build | `cargo build` | `Cargo.toml` exists |

#### Docker Compose

| Category | Command | Condition |
|---|---|---|
| config | `docker compose config --quiet` | `compose.yml` exists |
| health | `docker compose ps` | services with healthchecks |

#### Makefile

| Category | Command | Condition |
|---|---|---|
| lint | `make lint` | `lint` target exists |
| unit | `make test` | `test` target exists |
| build | `make build` | `build` target exists |

## Execution Order

```
lint → format → type → unit → integration → e2e → build → docker
```

Skip categories with no detected commands. Stop on first failure unless `--all`.

### Timeouts

| Category | Timeout |
|---|---|
| lint / format / type | 120s |
| unit tests | 300s |
| integration / e2e / build | 600s |

## Forbidden Commands

**Never execute** any of these:

| Category | Examples |
|---|---|
| Destructive data | `DROP`, `TRUNCATE`, `rm -rf`, `docker compose down -v` |
| Force operations | `--force`, `--yes`, `-f` (except `git commit --amend`) |
| Network pushes | `git push`, `npm publish`, `cargo publish`, `docker push` |
| Production deploys | `deploy`, `deploy-prod`, `kubectl apply` |
| Database migrations | `migrate`, `migrate:up`, `alembic upgrade` |
| Package install | `npm install`, `pip install`, `cargo install` |
| Reset/clean | `make clean`, `git reset --hard`, `git clean -fd` |
| Container destroy | `docker rm -f`, `docker compose down` |

## Report Format

```markdown
## Test Report

| Check | Status | Time |
|---|---|---|
| lint | ✓ passed | 2s |
| type | ✓ passed | 5s |
| unit | ✗ failed | 12s |
| integration | — skipped | — |

**Result:** 2 passed, 1 failed, 2 skipped
**Stopped at:** unit tests (first failure)
```

On all pass: `**Result:** All checks passed ✓  **Total time:** 15s`

On failure: show last 30 lines of output and suggest likely cause.

## Rules

- **Detect before running** — never guess the test command
- **Fastest first** — lint → type → unit → integration → e2e → build
- **Stop on failure** — unless explicitly asked to continue
- **Never install** — use what's already installed
- **Never destroy** — no `down`, `clean`, `reset`, `drop`, `publish`, `push`
- **Show timing** — report wall-clock time for each check
- **Compact output** — 30 lines max on failure
- **Respect timeouts** — kill hung processes, report timeout as failure
- **Run from root** — always execute from the repository root
