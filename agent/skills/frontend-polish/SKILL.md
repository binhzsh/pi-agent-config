---
name: frontend-polish
description: |-
  Review frontend apps for layout, spacing, typography, accessibility,
  responsiveness, empty states, loading states, error states, and visual
  hierarchy. Produces a prioritized checklist and optionally applies small
  safe improvements. Use proactively before shipping a UI, after a feature
  merge, or when a page looks "off" but you can't tell why.

  Examples:
  - user: "Polish this page" → audit UI and produce prioritized checklist
  - user: "Does this dashboard look right?" → review layout, spacing, a11y
  - user: "Add loading and empty states" → identify gaps and apply fixes
  - user: "Make this responsive" → audit breakpoints and apply safe fixes
---

# Frontend Polish

Review a frontend app or component for visual and UX quality. Produce a
prioritized checklist. Apply small safe improvements when the user asks.

## Purpose

Catch UI/UX issues before shipping. Ground findings in WCAG, responsive best
practices, and the project's own patterns — no subjective opinions.

## When to Use

- Before shipping a UI
- After a feature merge
- When a page looks "off"
- Accessibility audit

## Inputs

- Frontend source code (components, pages, styles)

## Outputs

- Prioritized checklist (P0/P1/P2) with file references
- Safe improvements applied (with approval)

## Safety Constraints

- Audit first, fix second — never edit without producing the checklist
- Safe fixes only without approval (see Safe Improvements table)
- Never restructure layout or change design tokens without explicit permission
- Respects existing design system and style guide

## Workflow

1. **Scan the UI surface** — identify all components, pages, shared elements
2. **Audit each dimension** — layout, spacing, typography, a11y, responsiveness, states, hierarchy
3. **Produce checklist** — prioritized by impact (P0 = blocking, P1 = important, P2 = nice)
4. **Apply safe fixes** — only if user explicitly asks; never change layout without approval

## Audit Dimensions

### 1. Layout

Alignment, container width, flex/grid consistency, overflow, whitespace balance, symmetry.

### 2. Spacing

Consistent scale (4, 8, 12, 16, 24, 32, 48, 64), internal vs external pattern, section rhythm, card spacing, button group gaps.

### 3. Typography

Font scale ratio (1.125–1.25), line height (body ≥ 1.5), line length (45–75ch), weight hierarchy, ≤ 2 font families, WCAG AA contrast (4.5:1).

### 4. Accessibility

Semantic HTML (`<button>` not `<div onclick>`), heading order (no skipped levels), alt text, form labels, visible focus ring, no color-only info, ARIA landmarks, skip links, logical tab order, `prefers-reduced-motion`, touch targets ≥ 44×44px, `aria-live` for dynamic content.

### 5. Responsiveness

Breakpoints (~320, ~768, ~1024, ~1440px), mobile-first, fluid typography (`clamp()`), `max-width: 100%` on images, table handling, nav collapse, no hover-only on touch.

### 6. Empty States

Empty lists show message + action, search no results shows suggestions, dashboards show onboarding CTA, consistent empty state style.

### 7. Loading States

Skeleton screens or spinners, inline loading indicators, disabled submit buttons with spinner, optimistic UI with rollback, timeout fallback (30s), no layout jank.

### 8. Error States

Inline form validation, user-friendly network errors, custom 404/500 pages, dismissible toasts, retry actions, error boundaries, errors on blur not mount.

### 9. Visual Hierarchy

One clear CTA per view, most important info most prominent, elevation communicates depth, related items grouped, scannable in < 5 seconds, consistent component styles, icons supplement text never replace.

## Checklist Output

```markdown
## Frontend Polish Checklist

### P0 — Blocking (fix before ship)
- [ ] [dimension] [issue] — [specific file/line]

### P1 — Important (fix this sprint)
- [ ] [dimension] [issue] — [specific file/line]

### P2 — Nice (backlog)
- [ ] [dimension] [issue] — [specific file/line]

### Summary
- **Total issues:** N
- **P0:** N | **P1:** N | **P2:** N
- **Biggest win:** [single highest-impact change]
```

### Priority Rules

| Priority | Criteria |
|---|---|
| **P0** | Breaks usability, blocks a11y compliance, causes data loss, crashes |
| **P1** | Degrades UX noticeably, inconsistent with design system |
| **P2** | Polish detail, minor inconsistency, nice-to-have |

## Safe Improvements (Apply Without Approval)

| Fix | Example |
|---|---|
| Add missing `alt` | `<img>` → `<img alt="..." />` |
| Add missing `label` | `<input>` → `<label>` + `<input>` |
| Fix heading order | `<h4>` after `<h2>` → `<h3>` |
| Add `role="status"` | `<div>Loading...</div>` → `<div role="status">` |
| Add `prefers-reduced-motion` | Wrap animations in media query |
| Fix `outline: none` | Add `:focus-visible` ring |
| Add `defer` to scripts | `<script src="...">` → `<script defer>` |
| Add `loading="lazy"` | Below-fold images |
| Add `type="button"` | `<button>` inside forms |

## Rules

- **Audit first, fix second** — never start editing without the checklist
- **Be specific** — cite file paths and line numbers
- **One issue per item** — no bundling
- **Respect the design system** — reference style guide or design tokens
- **No subjective opinions** — ground findings in WCAG or project patterns
- **Flag the biggest win** — always identify the single highest-impact change
- **Count issues** — always include summary with totals per priority
