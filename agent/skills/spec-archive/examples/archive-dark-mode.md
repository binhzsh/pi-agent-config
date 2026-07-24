# Example: Archive Dark Mode

## User
/archive add-dark-mode

## Agent

Let me check the status of this change...

**Artifacts:** ✓ All present (proposal, specs, design, tasks)
**Tasks:** 8/8 complete ✓

### Delta spec sync:

**specs/theme-selection/spec.md** → **openspec/specs/theme-selection/spec.md**

Changes to apply:
- **ADDED**: Theme selection requirement (3 scenarios)
  - User toggles dark mode
  - System preference detection
  - Persistence via localStorage

Syncing... ✓

```bash
mv openspec/changes/add-dark-mode openspec/changes/archive/2025-01-15-add-dark-mode/
```

---

## Archive Complete

**Change:** add-dark-mode
**Archived to:** openspec/changes/archive/2025-01-15-add-dark-mode/
**Specs:** ✓ Synced to main specs

All artifacts complete. All tasks complete.

The theme-selection spec is now in `openspec/specs/theme-selection/spec.md` and will
guide future implementations.
