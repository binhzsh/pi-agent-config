---
name: portfolio-writer
description: |-
  Turn a finished technical project into a polished README and portfolio case
  study. Produces problem statement, architecture overview, tech stack, tradeoffs,
  screenshot placeholders, setup instructions, lessons learned, and resume-ready
  bullets. Use proactively when a project is complete and needs documentation,
  when preparing for job applications, or when a repo lacks a compelling README.

  Examples:
  - user: "Write a README for this project" → scan codebase and generate README.md
  - user: "Turn this into a portfolio piece" → produce case study with architecture
  - user: "I need resume bullets for this project" → extract impact-driven bullets
  - user: "Document this repo" → full README with setup, stack, and tradeoffs
---

# Portfolio Writer

Turn a finished project into a polished README and portfolio-ready case study.

## Purpose

Transform code into compelling documentation that communicates impact, architecture,
and technical depth. Tailored for GitHub, portfolios, and resumes.

## When to Use

- A project is complete and needs documentation
- Preparing for job applications
- A repo lacks a compelling README
- Building a portfolio

## Inputs

- A finished project (codebase)
- User-provided context (problem, audience, metrics, tradeoffs)

## Outputs

- `README.md` at repository root
- Resume-ready bullets (3–5)
- Optional: portfolio case study variant

## Safety Constraints

- Read-only codebase scan — never modifies source files
- Asks user for non-inferable details (problem, tradeoffs, metrics)
- Uses placeholder screenshots until user provides real ones
- Honest tradeoffs — doesn't make decisions sound obvious

## Workflow

1. **Interview** — gather project details (skip fields clear from codebase)
2. **Scan the codebase** — detect stack, architecture, entrypoints, tests
3. **Write README.md** — structured document with all sections
4. **Extract resume bullets** — impact-driven, quantified, action-oriented
5. **Review** — show output; offer to refine tone, add screenshots, adjust depth

## Interview Fields

Ask for missing details. Infer from codebase where possible.

| Field | Inferable? |
|---|---|
| Project name | Yes — repo name, package.json |
| One-liner | Partially — from package description |
| Problem | No — must ask |
| Audience | Partially — from domain, API surface |
| Key features | Partially — from routes, modules |
| Architecture | Partially — from directory layout |
| Tech stack | Yes — from manifests, imports |
| Tradeoffs | No — must ask |
| Metrics | No — must ask |
| Status | Partially — from CI, deploy configs |
| Screenshots | No — must ask |
| Target | No — must ask |

## Codebase Scan

Detect automatically: language, framework, package manager, entry points, database,
caching, message queue, testing, CI/CD, deployment, linting, repo size (LOC, files).

## README Template

```markdown
# Project Name

> One-sentence description.

## Problem

[2–3 sentences — who experiences this and how often.]

## Solution

[2–3 sentences — approach, not implementation details.]

## Architecture

[ASCII box diagram — under 20 lines, box-drawing characters]

### Key Components

| Component | Technology | Responsibility |
|---|---|---|

## Tech Stack

| Category | Choice | Why |
|---|---|---|

## Tradeoffs

| Decision | Chose | Considered | Rationale |
|---|---|---|---|

## Setup

### Quick Start

```bash
# 1. Clone
# 2. Install
# 3. Configure
# 4. Run
# 5. Test
```

## Screenshots

<!-- TODO: Add screenshots -->

## Lessons Learned

1. **[Lesson]** — [what happened, what you learned]

## Resume Bullets

- [Action verb] [achievement] using [tech] — [quantified impact]
```

## Resume Bullets Formula

```
[Strong action verb] [specific achievement] using [tech/tools] — [quantified impact]
```

### Rules

- Lead with action — never "Responsible for..." or "Worked on..."
- Name the technology — "using Go" not "using a backend language"
- Quantify when possible — "reduced latency by 40%" not "improved performance"
- Show scope — "serving 10K daily users" not "for users"
- Keep to one line — max 20 words per bullet

## Variants

| Variant | Focus |
|---|---|
| GitHub README | Full structure; focus on developers |
| Portfolio Case Study | More problem/impact emphasis; deeper tradeoffs |
| Resume Entry | Condensed: name, one-liner, stack, 3–5 bullets, link |

## Rules

- **Interview first** — gather details before writing
- **Be specific** — name real technologies, not categories
- **Quantify everything** — LOC, latency, throughput, coverage
- **Honest tradeoffs** — show real tension between alternatives
- **Real lessons** — specific to this project, not generic advice
- **No fluff** — every sentence conveys information
- **ASCII diagrams** — render everywhere, no Mermaid dependencies
- **Screenshot placeholders** — always include the section even if empty
