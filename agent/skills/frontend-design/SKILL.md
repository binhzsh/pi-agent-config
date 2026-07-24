---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code that avoids generic AI aesthetics. Use when the user asks to build web components, pages, artifacts, posters, or applications, or when any design skill requires project context.
---

# Frontend Design Skill

Create distinctive, production-grade frontend interfaces. Avoids generic AI aesthetics.

## Design Principles

1. **Distinctive over generic** — No more Bootstrap-looking UIs. Use unique layouts, unexpected color combinations, and creative typography.
2. **Content-first** — Design around the content, not the other way around. Let content dictate layout.
3. **Micro-interactions** — Subtle hover states, transitions, and feedback make interfaces feel alive.
4. **Whitespace is your friend** — Generous padding, breathing room between elements.
5. **Typography hierarchy** — Clear visual hierarchy with size, weight, and color.
6. **Consistent spacing system** — Use a 4px or 8px grid for all spacing.
7. **Dark mode ready** — Design with CSS variables for easy theme switching.

## What to Avoid

- Generic gradients (purple-to-blue)
- Rounded corners on everything (8px everywhere)
- Box shadows on everything
- Arial/Helvetica/Inter as the only font choices
- Symmetrical layouts with no visual interest
- Stock-looking component libraries

## Stack Preferences

- **CSS**: Tailwind CSS preferred, or CSS modules with variables
- **Components**: Keep them small and composable
- **Animations**: CSS transitions over JS animations when possible
- **Icons**: SVG inline, not icon libraries (unless necessary)
- **Images**: WebP format, lazy loaded, with proper alt text

## Code Generation Rules

1. Generate complete, working code — no placeholders
2. Include responsive breakpoints (mobile, tablet, desktop)
3. Add loading, empty, and error states
4. Use semantic HTML (header, main, footer, nav, article)
5. Include ARIA attributes for accessibility
6. Add CSS custom properties for theming
7. Keep components under 200 lines when possible

## Design Patterns

- **Hero sections**: Full-width with layered content
- **Cards**: Consistent padding, hover states, clear hierarchy
- **Forms**: Floating labels, clear validation, accessible error states
- **Navigation**: Responsive hamburger menu, clear active states
- **Data tables**: Sortable, paginated, with empty states
- **Modals**: Focus trap, backdrop click to close, keyboard dismissible
