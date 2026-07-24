# Example: Explore Dark Mode

## User
/explore dark mode

## Agent (Explore Mode)

Great idea — let me look at your styling setup first.

```bash
# Check existing styling
find src/ -name "*.css" -o -name "*.scss" -o -name "*.tsx" | head -20
grep -r "theme\|color\|dark" src/ --include="*.css" --include="*.tsx" | head -10
```

I see you're using Tailwind CSS with existing color tokens. Here's what I found:

```
Current setup:
┌──────────────────────────────────────┐
│  Tailwind CSS (v3)                   │
│  ├── config.js (theme colors)       │
│  ├── components/                     │
│  │   └── Header.tsx (uses bg-white) │
│  └── pages/                          │
│       └── Index.tsx                  │
└──────────────────────────────────────┘
```

## Options for dark mode:

**Option A: Tailwind's built-in dark mode** (recommended)
- Use `dark:` prefix classes
- Toggle with a class on `<html>` element
- Pros: Zero dependencies, works with existing setup
- Cons: Requires class toggle, no JS fallback

**Option B: CSS custom properties**
- Define `--bg-primary`, `--text-primary` etc.
- Switch via data attribute
- Pros: More flexible, CSS-only switching
- Cons: More boilerplate, need to refactor existing colors

**Option C: Separate theme files**
- `light.css` and `dark.css`
- Pros: Complete separation
- Cons: Duplicated styles, harder to maintain

## Questions to consider:
1. Should it respect system preference (`prefers-color-scheme`)?
2. Should the choice persist (localStorage)?
3. Which components need dark mode first?

This feels solid enough to start a change. Want me to create a proposal with `/propose add-dark-mode`?
