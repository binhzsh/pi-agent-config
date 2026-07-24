# Example: Propose Dark Mode

## User
/propose add-dark-mode

## Agent

Creating change: `add-dark-mode`

```bash
mkdir -p openspec/changes/add-dark-mode/specs
echo "schema: spec-driven" > openspec/changes/add-dark-mode/.openspec.yaml
```

### Created artifacts:

**1. proposal.md** — Why dark mode matters, what changes, impact on components

**2. specs/theme-selection/spec.md** — User can toggle themes, system preference detection, persistence

**3. design.md** — Tailwind dark mode strategy, CSS variables approach, localStorage persistence

**4. tasks.md** — 8 implementation tasks:
- Setup Tailwind dark mode config
- Create theme toggle component
- Add theme context provider
- Update existing components
- Wire up localStorage persistence
- Add system preference detection
- Add CSS fallbacks
- Test and verify

```
## Implementing: add-dark-mode

All artifacts needed for implementation are ready.

Run `/apply` or ask me to implement to start working on the tasks.
```
