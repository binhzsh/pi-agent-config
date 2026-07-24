---
name: spec-workflow
description: |-
  Spec-driven development for Pi — a fluid, iterative workflow: explore ideas,
  propose changes with specs/design/tasks, implement, then archive. Use when the
  user wants to plan before building, track changes systematically, or maintain
  a clear spec trail. Integrates with graphify for codebase context.

  Examples:
  - user: "/explore" → enter thinking mode, investigate the codebase
  - user: "/propose add-dark-mode" → create full change with proposal, specs, design, tasks
  - user: "/apply" → implement tasks from the active change
  - user: "/archive" → finalize and file away a completed change
---

# Pi Spec-Driven Development

A lightweight, agent-native spec-driven development workflow. No CLI dependency —
everything runs through Pi skills and plain Markdown files.

## Philosophy

```
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
```

## The Workflow

```
/explore     →  Think through ideas, investigate, compare options
/propose     →  Create a change with proposal, specs, design, tasks
/apply       →  Implement tasks, updating artifacts as needed
/archive     →  Archive when done, sync specs to main
```

## Directory Structure

Changes live in `openspec/changes/<name>/` with this structure:

```
openspec/
├── config.yaml              # Project context and rules
├── changes/
│   ├── <change-name>/
│   │   ├── .openspec.yaml   # Change metadata
│   │   ├── proposal.md      # Why + what changes
│   │   ├── specs/
│   │   │   └── <capability>/spec.md  # Delta specs
│   │   ├── design.md        # Technical approach
│   │   └── tasks.md         # Implementation checklist
│   └── archive/             # Completed changes
└── specs/                   # Main specs (synced from changes)
    └── <capability>/spec.md
```

## How It Works

1. **Explore** (`spec-explore` skill) — Think freely, investigate the codebase,
   use graphify for context. No pressure to formalize.

2. **Propose** (`spec-propose` skill) — Create a change with all planning artifacts.
   The AI generates proposal, specs, design, and tasks from the user's description.

3. **Apply** (`spec-apply` skill) — Work through tasks, mark complete, update
   artifacts when design decisions change. Fluid — go back and revise anytime.

4. **Archive** (`spec-archive` skill) — Sync delta specs to main specs, move
   the change to archive. Clean handoff.

## Project Configuration

Create `openspec/config.yaml` once per project:

```yaml
schema: spec-driven
context: |
  Tech stack: TypeScript, React, Node.js
  API conventions: RESTful, JSON responses
  Testing: Vitest for unit tests

rules:
  specs:
    - Use WHEN/THEN format for scenarios
  tasks:
    - Keep tasks small enough for one session
```

## Integration with Graphify

When exploring or proposing, use graphify for codebase context:
- Run `graphify query` to understand architecture
- Use `graphify path` to trace relationships
- Reference `graphify-out/GRAPH_REPORT.md` for broad context

## Rules

- **Specs describe behavior, not implementation** — what the system does, not how
- **Tasks are trackable** — each uses `- [ ]` checkbox format
- **Artifacts are living documents** — update them as understanding evolves
- **Delta specs only** — specs/ in changes/ contain only what changes (ADDED/MODIFIED/REMOVED)
- **Archive preserves context** — archived changes stay readable for reference
