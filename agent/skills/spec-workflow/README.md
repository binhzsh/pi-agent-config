# Pi Spec-Driven Development (PiSDD)

A lightweight, agent-native spec-driven development workflow. No CLI dependency —
everything runs through Pi skills and plain Markdown files.

## Quick Start

```
/explore       →  Think through ideas, investigate, compare options
/propose <name> →  Create a change with proposal, specs, design, tasks
/apply         →  Implement tasks from the active change
/archive       →  Finalize and file away a completed change
```

## Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| `spec-workflow` | `/spec-workflow` | Overview of the system |
| `spec-explore` | `/explore` | Thinking partner for ideas |
| `spec-propose` | `/propose` | Create change with all artifacts |
| `spec-apply` | `/apply` | Implement tasks |
| `spec-archive` | `/archive` | Sync specs and archive |

## Directory Structure

```
openspec/
├── config.yaml              # Project context and rules
├── changes/
│   ├── <change-name>/       # Active changes
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

## Workflow

1. **Explore** — Think freely, investigate the codebase, use graphify for context
2. **Propose** — Create a change with proposal, specs, design, tasks
3. **Apply** — Work through tasks, mark complete, update artifacts as needed
4. **Archive** — Sync delta specs to main specs, move change to archive

## Integration with Graphify

When exploring or proposing, use graphify for codebase context:
- `graphify query "<topic>"` — broad exploration
- `graphify path "<A>" "<B>"` — trace relationships
- `graphify-out/GRAPH_REPORT.md` — broad architecture context

## Differences from OpenSpec

| Feature | OpenSpec | PiSDD |
|---------|----------|-------|
| CLI dependency | Yes (`openspec` CLI) | No — pure agent skills |
| Commands | `/opsx:*` (OpenSpec) | `/explore`, `/propose`, `/apply`, `/archive` (Pi) |
| Expanded workflow | Yes (`/opsx:new`, etc.) | No — lean core only |
| Graphify integration | No | Yes — native |
| Skills structure | Per-tool (Claude, Cursor, etc.) | Pi-native skills |
| Delta specs | Yes | Yes |
| Config | `openspec/config.yaml` | `openspec/config.yaml` |

## Templates

Templates are in `spec-workflow/resources/templates/`:
- `proposal.md` — Change proposal template
- `spec.md` — Spec template (delta format)
- `design.md` — Design document template
- `tasks.md` — Task list template

## Rules

- **Specs describe behavior, not implementation** — what the system does, not how
- **Tasks are trackable** — each uses `- [ ]` checkbox format
- **Artifacts are living documents** — update them as understanding evolves
- **Delta specs only** — specs/ in changes/ contain only what changes
- **Archive preserves context** — archived changes stay readable for reference
