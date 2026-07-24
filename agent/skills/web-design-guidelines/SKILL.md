---
name: web-design-guidelines
description: |-
  Review UI code for web interface guideline compliance — accessibility, focus
  states, forms, animation, typography, performance, dark mode, hydration safety,
  and anti-patterns. Use proactively when asked to "review my UI", "check
  accessibility", "audit design", "review UX", or "check my site against best
  practices".

  Examples:
  - user: "Review this component for accessibility" → scan for aria, labels, semantics
  - user: "Audit my landing page" → check all guideline categories
  - user: "Does this form follow best practices?" → labels, autocomplete, errors
  - user: "Check my site against web standards" → full guideline sweep
  - user: "Is this modal a11y-friendly?" → focus trap, overscroll, aria
---

# Web Interface Guidelines Review

Review the specified files for compliance with web interface guidelines. Output
concise, high signal-to-noise findings in `file:line` format.

## Workflow

1. Read the target files (ask user if none specified)
2. Check against every rule category below
3. Output grouped by file, terse `file:line` format
4. Mark files with no issues as `✓ pass`

## Rules

### Accessibility

- Icon-only buttons need `aria-label`
- Form controls need `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp`)
- `<button>` for actions, `<a>`/`<Link>` for navigation — never `<div onClick>`
- Images need `alt` (or `alt=""` if decorative)
- Decorative icons need `aria-hidden="true"`
- Async updates (toasts, validation) need `aria-live="polite"`
- Use semantic HTML before ARIA
- Headings hierarchical `<h1>`–`<h6>`; include skip link for main content
- `scroll-margin-top` on heading anchors

### Focus States

- Interactive elements need visible focus: `focus-visible:ring-*` or equivalent
- Never `outline-none` / `outline: none` without focus-visible replacement
- Prefer `:focus-visible` over `:focus` (avoid ring on mouse click)
- Group focus with `:focus-within` for compound controls

### Forms

- Inputs need `autocomplete` and meaningful `name`
- Correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- Never block paste (`onPaste` + `preventDefault`)
- Labels clickable (`htmlFor` or wrapping control)
- Disable spellcheck on emails, codes, usernames (`spellCheck={false}`)
- Checkboxes/radios: label + control share single hit target
- Submit button enabled until request starts; spinner during request
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern
- `autocomplete="off"` on non-auth fields to avoid password manager triggers
- Warn before navigation with unsaved changes

### Animation

- Honor `prefers-reduced-motion`
- Animate `transform`/`opacity` only (compositor-friendly)
- Never `transition: all` — list properties explicitly
- Set correct `transform-origin`
- SVG: transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Animations interruptible — respond to user input mid-animation

### Typography

- `…` not `...`
- Curly quotes `"` `"` not straight `"`
- Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`
- Loading states end with `…`: `"Loading…"`, `"Saving…"`
- `font-variant-numeric: tabular-nums` for number columns
- `text-wrap: balance` or `text-pretty` on headings

### Content Handling

- Text containers handle long content: `truncate`, `line-clamp-*`, `break-words`
- Flex children need `min-w-0` to allow truncation
- Handle empty states — no broken UI for empty strings/arrays
- Anticipate short, average, and very long user inputs

### Images

- `<img>` needs explicit `width` and `height` (prevents CLS)
- Below-fold: `loading="lazy"`
- Above-fold critical: `priority` or `fetchpriority="high"`

### Performance

- Large lists (>50 items): virtualize or `content-visibility: auto`
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`, etc.)
- Prefer uncontrolled inputs; controlled inputs must be cheap per keystroke
- `<link rel="preconnect">` for CDN/asset domains
- Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`

### Navigation & State

- URL reflects state — filters, tabs, pagination in query params
- Links use `<a>`/`<Link>` (Cmd/Ctrl+click, middle-click support)
- Deep-link all stateful UI
- Destructive actions need confirmation modal or undo — never immediate

### Touch & Interaction

- `touch-action: manipulation` (prevents double-tap zoom delay)
- `overscroll-behavior: contain` in modals/drawers/sheets
- During drag: disable text selection, `inert` on dragged elements
- `autoFocus` sparingly — desktop only, single primary input; avoid on mobile

### Safe Areas & Layout

- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Avoid unwanted scrollbars: `overflow-x-hidden` on containers
- Flex/grid over JS measurement for layout

### Dark Mode & Theming

- `color-scheme: dark` on `<html>` for dark themes
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit `background-color` and `color`

### Locale & i18n

- Dates/times: `Intl.DateTimeFormat`, not hardcoded
- Numbers/currency: `Intl.NumberFormat`, not hardcoded
- Detect language via `navigator.languages`, not IP
- Brand names, code tokens: `translate="no"`

### Hydration Safety

- Inputs with `value` need `onChange` (or `defaultValue` for uncontrolled)
- Date/time rendering: guard against server/client mismatch
- `suppressHydrationWarning` only where truly needed

### Hover & Interactive States

- Buttons/links need `hover:` state
- Interactive states increase contrast

### Content & Copy

- Active voice
- Title Case for headings/buttons
- Numerals for counts: "8 deployments" not "eight"
- Specific button labels: "Save API Key" not "Continue"
- Error messages include fix/next step
- `&` over "and" where space-constrained

### Anti-patterns (flag immediately)

- `user-scalable=no` or `maximum-scale=1`
- `onPaste` with `preventDefault`
- `transition: all`
- `outline-none` without focus-visible replacement
- Inline `onClick` navigation without `<a>`
- `<div>` or `<span>` with click handlers (should be `<button>`)
- Images without dimensions
- Large arrays `.map()` without virtualization
- Form inputs without labels
- Icon buttons without `aria-label`
- Hardcoded date/number formats
- `autoFocus` without justification

## Output Format

Group by file. Use `file:line` format. Terse. Skip explanation unless fix is
non-obvious. No preamble.

```
## src/Button.tsx

src/Button.tsx:42 - icon button missing aria-label
src/Button.tsx:18 - input lacks label
src/Button.tsx:55 - animation missing prefers-reduced-motion
src/Button.tsx:67 - transition: all → list properties

## src/Modal.tsx

src/Modal.tsx:12 - missing overscroll-behavior: contain
src/Modal.tsx:34 - "..." → "…"

## src/Card.tsx

✓ pass
```

## Live Guidelines

For the latest rules, fetch from:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```
