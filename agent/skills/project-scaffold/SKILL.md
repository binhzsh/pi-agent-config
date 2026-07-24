---
name: project-scaffold
description: |-
  Scaffold a new project with the correct structure, config files, and
  conventions for a given stack. Supports FastAPI/Python, Astro/TypeScript,
  React/Vite, Go CLI, Rust CLI, and Docker Compose services. Produces a
  ready-to-code repository with linting, testing, and CI pre-configured.
  Use proactively when starting a new project or generating a boilerplate.

  Examples:
  - user: "Scaffold a FastAPI project" → generate Python project with pytest, ruff, CI
  - user: "New Astro site" → generate Astro project with TypeScript, tailwind, tests
  - user: "Go CLI tool" → generate Go project with cobra, golangci-lint, tests
  - user: "React app with Vite" → generate Vite + React + TypeScript + Vitest
---

# Project Scaffold

Generate a ready-to-code project structure for a given stack. Every scaffold
includes linting, testing, and CI pre-configured.

## Purpose

Eliminate boilerplate setup. Produce a consistent, production-ready project
structure with sensible defaults for any supported stack.

## When to Use

- Starting a new project from scratch
- Generating a boilerplate for a team
- Creating a demo or proof-of-concept
- When asked to "scaffold" or "bootstrap" a project

## Inputs

- Stack/technology choice (FastAPI, Astro, Go, Rust, React/Vite, etc.)
- Project name
- Optional: features (auth, DB, API, CLI, web UI)

## Outputs

- Complete project directory structure
- Config files (lint, test, CI, editor)
- Placeholder source files with structure
- `README.md` with quick start instructions

## Safety Constraints

- Creates files only in the target directory — never overwrites existing files without confirmation
- Never includes real secrets or credentials
- Uses placeholder values in all config files
- Documents all assumptions in the generated README

## Workflow

1. **Confirm stack** — identify the target technology and any features
2. **Choose conventions** — select linting, testing, CI tools for the stack
3. **Generate directory structure** — create all directories and placeholder files
4. **Write config files** — lint, test, type-check, CI, editor settings
5. **Write placeholder source** — entry point, main module, test skeleton
6. **Write README.md** — quick start, structure overview, commands
7. **Verify** — confirm the structure is complete and consistent

## Stack Templates

### FastAPI / Python

```
project/
├── pyproject.toml              # project metadata, deps, tool config (ruff, pytest, mypy)
├── uv.lock                     # lockfile (generated after uv sync)
├── README.md
├── .gitignore
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml              # lint + test on push/PR
├── src/
│   └── <project>/
│       ├── __init__.py
│       ├── main.py             # FastAPI app factory
│       ├── config.py           # settings with pydantic-settings
│       ├── api/
│       │   ├── __init__.py
│       │   └── v1/
│       │       ├── __init__.py
│       │       └── router.py   # API router
│       ├── models/
│       │   └── __init__.py
│       └── services/
│           └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # fixtures
│   └── test_api.py             # smoke test
└── scripts/
    └── dev.sh                  # local dev runner
```

**Tool defaults:** ruff (lint + format), mypy (type), pytest (test), uv (package manager), GitHub Actions (CI).

### Astro / TypeScript

```
project/
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── tailwind.config.mjs
├── vitest.config.ts
├── biome.json                  # lint + format
├── README.md
├── .gitignore
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml              # lint + type + build + test
├── public/
│   └── favicon.svg
└── src/
    ├── app.css
    ├── app.tsx                 # root layout
    ├── components/
    │   └── Header.astro
    ├── content/
    │   └── config.ts
    └── pages/
        └── index.astro
```

**Tool defaults:** Biome (lint + format), TypeScript (type), Vitest (test), GitHub Actions (CI).

### React / Vite / TypeScript

```
project/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vitest.config.ts
├── biome.json
├── README.md
├── .gitignore
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    ├── hooks/
    ├── utils/
    └── __tests__/
        └── App.test.tsx
```

**Tool defaults:** Biome (lint + format), TypeScript (type), Vitest (test + coverage), GitHub Actions (CI).

### Go CLI

```
project/
├── go.mod
├── go.sum
├── Makefile                    # build, test, lint, run targets
├── .golangci.yml
├── README.md
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml
├── cmd/
│   └── root.go                 # cobra root command
├── internal/
│   ├── config/
│   │   └── config.go
│   └── cli/
│       └── cli.go
└── tests/
    └── root_test.go
```

**Tool defaults:** golangci-lint (lint), go test (test), Go 1.21+ (stdlib).

### Rust CLI

```
project/
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
├── README.md
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── main.rs
│   ├── cli.rs                  # clap argument parsing
│   ├── config.rs
│   └── lib.rs
└── tests/
    └── integration.rs
```

**Tool defaults:** clippy (lint), cargo test (test), rustfmt (format), GitHub Actions (CI).

## CI Workflow Template (GitHub Actions)

Each scaffold includes a `.github/workflows/ci.yml` appropriate for the stack:

```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - # stack-specific setup steps
      - # lint
      - # type-check
      - # test
      - # build
```

## README Template

Each scaffold generates a `README.md` with:

- Project name and one-liner
- Tech stack table
- Quick start (install, configure, run, test)
- Project structure overview
- Available commands table
- Development guidelines

## Rules

- **Never overwrite** — confirm before creating files in a non-empty directory
- **No secrets** — use placeholder values in all config files
- **Consistent conventions** — follow the tool defaults for each stack
- **CI included** — every scaffold has a working CI workflow
- **Tests included** — every scaffold has a test skeleton with at least one smoke test
- **README included** — every scaffold has a quick-start README
- **Document assumptions** — note any decisions made during scaffolding
- **Idempotent** — running scaffold twice should not duplicate files
