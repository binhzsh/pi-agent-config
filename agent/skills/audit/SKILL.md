---
name: audit
description: Run technical quality checks across accessibility, performance, theming, responsive design, and anti-patterns. Generates a scored report with P0-P3 severity ratings and actionable plan. Use when the user wants an accessibility check, performance audit, or technical quality review.
---

# Audit Skill

Run technical quality audits on web/frontend code. Produces a scored report with severity ratings.

## How It Works

1. **Scan** the project for relevant files (HTML, CSS, JS/TS, components)
2. **Check** against these categories:
   - **Accessibility**: ARIA labels, alt text, focus states, keyboard navigation, color contrast, semantic HTML
   - **Performance**: Bundle size, lazy loading, image optimization, render blocking, unused CSS/JS
   - **Theming**: CSS variables, dark mode support, consistent design tokens
   - **Responsive**: Viewport meta, fluid typography, mobile breakpoints, touch targets
   - **Anti-patterns**: Inline styles, !important abuse, hardcoded values, missing error states

## Severity Levels

- **P0 (Critical)**: Blocks functionality or accessibility. Must fix before ship.
- **P1 (High)**: Significant UX/performance impact. Fix before next release.
- **P2 (Medium)**: Nice-to-have improvements. Schedule for backlog.
- **P3 (Low)**: Minor polish. Fix when convenient.

## Output Format

```
## Audit Report

### Scores
| Category | Score | Issues |
|----------|-------|--------|
| Accessibility | 7/10 | 3 |
| Performance | 8/10 | 2 |
| Theming | 6/10 | 4 |
| Responsive | 9/10 | 1 |
| Anti-patterns | 7/10 | 2 |

### P0 Issues
- [ ] ...

### P1 Issues
- [ ] ...

### Action Plan
1. Fix P0 issues
2. Address P1 issues
3. Schedule P2/P3 for backlog
```

## Rules

- Always scan the full project, not just one file
- Provide specific file paths and line numbers
- Include code examples for fixes
- Never suggest adding dependencies unless absolutely necessary
- Prioritize P0 > P1 > P2 > P3
