---
name: repo-audit
description: |-
  Inspect a repository and generate a concise REPO_AUDIT.md architecture report.
  Identifies project type, entrypoints, dependencies, scripts, environment
  variables, test setup, build setup, deployment setup, and likely fragile areas.
  Use proactively when onboarding to an unfamiliar codebase, reviewing a new repo,
  or before a major refactor.

  Examples:
  - user: "Audit this repo" → scan project and write REPO_AUDIT.md
  - user: "What is this codebase about?" → generate architecture report
  - user: "I just cloned this, give me a summary" → produce REPO_AUDIT.md
---

# Repo Audit

Generate `REPO_AUDIT.md` at the repository root.

## Purpose

Produce a concise, accurate architecture report for any codebase. Every claim is
grounded in files actually read. No hallucination, no guessed details.

## When to Use

- Onboarding to an unfamiliar repository
- Before a major refactor or migration
- When a repo lacks documentation
- Before writing a portfolio piece or README

## Inputs

A checked-out repository (current working directory or specified path).

## Outputs

`REPO_AUDIT.md` at the repository root.

## Safety Constraints

- Read-only operation — never modifies files
- Respects `.gitignore` — does not scan ignored paths
- Limits depth to top-level + one level into `src/`, `lib/`, `packages/`
- Marks unknowns as `not detected` rather than guessing

## Workflow

1. **Detect project type** — scan language markers, package manifests, config files
2. **Identify entrypoints** — locate main files, CLI entry points, server bootstraps
3. **Catalog dependencies** — extract direct and dev dependencies with versions
4. **List scripts** — find build/test/lint scripts in manifests and Makefiles
5. **Extract environment variables** — grep for env references and config loaders
6. **Map test setup** — locate test framework, config, coverage tools
7. **Map build setup** — locate bundler, compiler, transpiler config
8. **Map deployment setup** — locate Dockerfiles, CI/CD pipelines, deploy configs
9. **Flag fragile areas** — identify tight coupling, missing tests, deprecated patterns
10. **Write REPO_AUDIT.md** — output the report using the template below

## Investigation Checklist

### Project Type Detection

| Ecosystem | Indicators |
|---|---|
| Node.js/JS | `package.json`, `tsconfig.json`, `yarn.lock`, `pnpm-lock.yaml` |
| Python | `pyproject.toml`, `setup.py`, `requirements.txt` |
| Rust | `Cargo.toml`, `Cargo.lock` |
| Go | `go.mod`, `go.sum` |
| Astro | `astro.config.mjs`, `package.json` with `astro` dep |
| FastAPI | `pyproject.toml` with `fastapi` + `uvicorn` |
| React/Vite | `vite.config.*`, `package.json` with `react` + `vite` |
| Docker Compose | `compose.yml`, `docker-compose.yml` |

Also detect subtypes: web framework, CLI tool, library, monorepo, frontend app, mobile app.

### Entrypoints

Look for: `main()` functions, `index.js`/`app.js`/`server.js`, CLI entry points
(`bin/`, `scripts/`, `__main__.py`), framework routers (`routes/`, `controllers/`),
`package.json` `main`/`bin` fields, `src/main.tsx`, `src/App.tsx`, `src/index.ts`.

### Dependencies

Read package manifests. Separate **production** vs **dev** dependencies. Note key
versions, lockfile presence, and any known outdated packages.

### Scripts

Extract from: `package.json` → `scripts`, `Makefile` targets, `justfile` recipes,
`Taskfile.yml` tasks, shell scripts in `scripts/` or `bin/`.

### Environment Variables

Scan: `.env.example`, `.env.sample`, `process.env`, `os.environ`, `os.Getenv`,
config loaders (`dotenv`, `viper`), environment-specific configs (`config/`, `conf/`).

### Test Setup

Detect: framework (Jest, Vitest, pytest, cargo test, go test), config files,
test directory layout, coverage tools, mock patterns, E2E setup (Playwright, Cypress).
Flag if tests appear absent or sparse.

### Build Setup

Detect: bundler/transpiler (Webpack, Vite, esbuild, tsc), compiler flags, build
config files, asset pipeline, build output directory (`dist/`, `build/`, `target/`).

### Deployment Setup

Detect: `Dockerfile`, `docker-compose.yml`, CI/CD configs (`.github/workflows/`,
`.gitlab-ci.yml`), PaaS configs, cloud IaC, Kubernetes manifests, deploy scripts.

### Fragile Areas

Flag: missing tests on critical paths, tight coupling, hardcoded secrets, deprecated
dependencies, complex configuration, single points of failure, unpinned dependencies,
missing error handling, `TODO`/`FIXME`/`HACK` markers, files over 500 lines.

## Output Template

Write `REPO_AUDIT.md` using this structure:

```markdown
# Repo Audit

> Generated: [date]

## Project Type
- **Language(s):** [primary language(s)]
- **Ecosystem:** [framework, library type, app type]
- **Package manager:** [npm, pip, cargo, etc.]
- **Monorepo:** [yes/no, tool if yes]

## Entrypoints
| Entrypoint | File | Description |
|---|---|---|
| ... | ... | ... |

## Dependencies
### Production
- [key dependency] — [version] — [purpose if clear]
### Dev
- [key dependency] — [version] — [purpose if clear]
### Notes
- [lockfile present/absent, pinned/unpinned, notable version gaps]

## Scripts
| Command | Description |
|---|---|
| `npm run dev` | ... |

## Environment Variables
| Variable | Source | Purpose |
|---|---|---|
| ... | ... | ... |

## Test Setup
- **Framework:** [name + version]
- **Config:** [config file]
- **Location:** [test directory pattern]
- **Coverage:** [tool + config or "not configured"]
- **E2E:** [tool or "none detected"]
- **Health:** [healthy / sparse / missing]

## Build Setup
- **Toolchain:** [bundler/compiler/transpiler]
- **Config:** [config files]
- **Output:** [build directory]

## Deployment
- **CI/CD:** [platform + config file]
- **Container:** [Dockerfile present/absent]
- **Hosting:** [PaaS/IaC/K8s or "not detected"]

## Fragile Areas
1. **[Area]** — [brief explanation and risk level]

## Quick Start
```bash
# 1. Install
[install command]
# 2. Configure
[env setup]
# 3. Run
[run command]
# 4. Test
[test command]
```
```

## Rules

- **Be concise** — one line per item, no prose paragraphs
- **Be accurate** — only report what you actually found; mark unknowns as `not detected`
- **Be actionable** — fragile areas should suggest what to investigate
- **Skip sections gracefully** — write `None detected.` rather than omitting
- **Do not hallucinate** — if unreadable, note it; never guess
- **Respect .gitignore** — do not audit ignored files
- **Limit depth** — scan top-level and one level into `src/`, `lib/`, `packages/`
