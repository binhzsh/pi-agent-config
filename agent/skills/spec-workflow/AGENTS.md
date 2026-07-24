# Spec-Driven Development — Project Integration

Add this to your project's `AGENTS.md` to enable spec-driven development:

```markdown
## spec-driven

This project uses spec-driven development for planned changes. The workflow is:
explore → propose → apply → archive.

When the user types `/explore`, `/propose`, `/apply`, or `/archive`, invoke the
corresponding Pi skill (spec-explore, spec-propose, spec-apply, spec-archive).

Rules:
- Changes live in openspec/changes/<name>/
- Main specs are in openspec/specs/<capability>/spec.md
- Delta specs in changes/ only contain ADDED/MODIFIED/REMOVED blocks
- Archive moves changes to openspec/changes/archive/YYYY-MM-DD-<name>/
- Always sync delta specs to main specs before archiving
- Use graphify for codebase context during explore and propose
```

## Initialize

Run once per project:

```bash
# Via Pi
/spec-workflow init

# Or manually
mkdir -p openspec/changes/archive openspec/specs
```
