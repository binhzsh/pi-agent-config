# Pi Spec-Driven Development — Design Notes

## What This Is

A custom, Pi-native implementation of spec-driven development inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec) (62K+ stars). This is NOT a copy — it's a re-imagining optimized for Pi's agent architecture.

## Key Differences from OpenSpec

### Removed
| OpenSpec Feature | Why Removed | Pi Replacement |
|-----------------|-------------|----------------|
| `openspec` CLI dependency | Unnecessary overhead | Pure agent skills |
| `/opsx:*` command prefix | Tool-specific naming | Clean `/explore`, `/propose`, `/apply`, `/archive` |
| Expanded workflow (`/opsx:new`, `/opsx:continue`, etc.) | Bloat for most use cases | Core 4 commands cover 95% of workflows |
| Per-tool command files (Claude, Cursor, Windsurf, etc.) | Pi has its own skill system | Single skill per command |
| Stores (cross-repo spec sharing) | Beta feature, complex | Out of scope for v1 |
| Schema system (custom schemas) | Over-engineering | Single `spec-driven` schema is sufficient |

### Added
| Pi Feature | Purpose |
|-----------|---------|
| Graphify integration | Native codebase context during exploration |
| Pi skill structure | Proper frontmatter, relative paths, examples |
| Init script | One-command project setup |
| AGENTS.md integration | Project-level configuration |
| Example files | Concrete usage patterns |

## Architecture

```
spec-workflow/          # Main workflow overview
├── SKILL.md            # Entry point, explains the system
├── README.md           # User-facing documentation
├── AGENTS.md           # Project integration instructions
├── DESIGN.md           # This file
├── scripts/
│   └── init.sh         # Project initialization
├── resources/
│   ├── schema.yaml     # Artifact graph definition
│   └── templates/      # Markdown templates
│       ├── proposal.md
│       ├── spec.md
│       ├── design.md
│       └── tasks.md
└── spec-explore/       # /explore command
    ├── SKILL.md
    └── examples/
├── spec-propose/       # /propose command
    ├── SKILL.md
    └── examples/
├── spec-apply/         # /apply command
    ├── SKILL.md
    └── examples/
└── spec-archive/       # /archive command
    ├── SKILL.md
    └── examples/
```

## Workflow Design

### Explore (`/explore`)
- **Stance, not workflow** — no fixed steps, no required outputs
- Investigates codebase, uses graphify for context
- Surfaces options, compares approaches
- Offers to capture insights when decisions are made
- Never implements code

### Propose (`/propose <name>`)
- Creates change scaffold in `openspec/changes/<name>/`
- Generates all 4 artifacts in dependency order:
  1. `proposal.md` — why + what
  2. `specs/<capability>/spec.md` — delta specs (ADDED/MODIFIED/REMOVED)
  3. `design.md` — how (optional for simple changes)
  4. `tasks.md` — implementation checklist
- Uses templates from `spec-workflow/resources/templates/`
- Reads project context from `openspec/config.yaml`

### Apply (`/apply`)
- Works through tasks sequentially
- Marks `- [ ]` → `- [x]` as each task completes
- Pauses on blockers, design issues, or unclear tasks
- Suggests artifact updates when implementation reveals issues
- Shows progress throughout

### Archive (`/archive`)
- Checks artifact and task completion
- Merges delta specs into main specs
- Moves change to `openspec/changes/archive/YYYY-MM-DD-<name>/`
- Shows clear summary of what was synced

## Delta Spec Format

Delta specs only contain what changes, not the full spec:

```markdown
## Purpose
Lets users take their data out of the product in a portable format.

## ADDED Requirements
### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks "Export" button
- **THEN** system downloads a CSV file with all user data

## MODIFIED Requirements
### Requirement: Existing feature
[Full updated requirement block]

## REMOVED Requirements
### Requirement: Deprecated feature
**Reason**: Replaced by new system
**Migration**: Use new endpoint at /api/v2/export
```

## Future Extensions

Potential additions (not in v1):
- `/spec-workflow verify` — validate implementation against specs
- `/spec-workflow bulk-archive` — archive multiple completed changes
- Initiative support (groups of related changes)
- Cross-repo spec stores
- Custom schemas
- Dashboard/viewer for specs
