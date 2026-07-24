---
name: stitch-design-taste
description: |-
  Generate DESIGN.md files encoding a premium, opinionated design system for frontend
  projects. Enforces strict anti-generic UI rules: no Inter, no pure black, no neon glows,
  no 3-column equal cards, no AI copywriting clichés. Defines atmosphere, color palette,
  typography, component behaviors, layout principles, motion philosophy, and banned patterns.

  Use proactively when scaffolding a new project's design system, establishing visual
  guidelines, or ensuring UI output avoids generic AI-generated aesthetics.

  Examples:
  - user: "Create a design system for this project" → generate DESIGN.md with full rules
  - user: "What should our design guidelines be?" → produce DESIGN.md from project context
  - user: "Make sure our UI doesn't look AI-generated" → encode anti-patterns and taste rules
  - user: "Set up design tokens and component rules" → DESIGN.md with palette, type, motion
---

# Stitch Design Taste

Generate a `DESIGN.md` file that serves as the single source of truth for a premium, non-generic design language. The document is opinionated — it enforces a specific aesthetic and bans common AI design clichés.

## Workflow

1. **Read the project** — examine existing code, branding, or user description to understand intent
2. **Define the atmosphere** — evaluate density, variance, and motion on the taste spectrum
3. **Synthesize DESIGN.md** — follow the output format below, adapting rules to the project context

## 1. Define the Atmosphere

Evaluate the target project's intent using three axes:

| Axis | Scale (1–10) |
|------|-------------|
| **Density** | 1–3 "Art Gallery Airy" → 4–7 "Daily App Balanced" → 8–10 "Cockpit Dense" |
| **Variance** | 1–3 "Predictable Symmetric" → 4–7 "Offset Asymmetric" → 8–10 "Artsy Chaotic" |
| **Motion** | 1–3 "Static Restrained" → 4–7 "Fluid CSS" → 8–10 "Cinematic Choreography" |

**Default baseline:** Variance 8, Motion 6, Density 4. Adapt dynamically based on the project.

Write an evocative paragraph describing the mood. Example:

> "A restrained, gallery-airy interface with confident asymmetric layouts and fluid spring-physics motion. The atmosphere is clinical yet warm — like a well-lit architecture studio."

## 2. Map the Color Palette

For each color provide: **Descriptive Name** + **Hex Code** + **Functional Role**.

**Mandatory constraints:**

- Maximum **1 accent color**. Saturation below 80%
- "AI Purple/Blue Neon" aesthetic is **strictly BANNED** — no purple button glows, no neon gradients
- Use absolute neutral bases (Zinc/Slate) with high-contrast singular accents
- Stick to one palette — no warm/cool gray fluctuation
- Never use pure black (`#000000`) — use Off-Black, Zinc-950, or Charcoal

**Default palette:**

| Name | Hex | Role |
|------|-----|------|
| Canvas White | `#F9FAFB` | Primary background surface |
| Pure Surface | `#FFFFFF` | Card and container fill |
| Charcoal Ink | `#18181B` | Primary text, Zinc-950 depth |
| Muted Steel | `#71717A` | Secondary text, descriptions, metadata |
| Whisper Border | `rgba(226,232,240,0.5)` | Card borders, 1px structural lines |
| [Accent Name] | `#XXXXXX` | Single accent for CTAs, active states, focus rings |

## 3. Establish Typography Rules

- **Display/Headlines:** Track-tight, controlled scale. Hierarchy through weight and color, not just massive size
- **Body:** Relaxed leading, max 65 characters per line
- **Font Selection:** `Inter` is **BANNED** for premium/creative contexts. Force unique character: Geist, Outfit, Cabinet Grotesk, or Satoshi
- **Serif Ban:** Generic serif fonts (Times New Roman, Georgia, Garamond, Palatino) are **BANNED**. If serif is needed for editorial/creative contexts, use only distinctive modern serifs: Fraunces, Gambarino, Editorial New, or Instrument Serif. Serif is always **BANNED** in dashboards or software UIs
- **Dashboard Constraint:** Use Sans-Serif pairings exclusively (Geist + Geist Mono or Satoshi + JetBrains Mono)
- **High-Density Override:** When density exceeds 7, all numbers must use Monospace

## 4. Define the Hero Section

The Hero is the first impression — creative, striking, never generic:

- **Inline Image Typography:** Embed small, contextual photos or visuals directly between words or letters in the headline. Images sit inline at type-height, rounded, acting as visual punctuation. This is the signature creative technique
- **No Overlapping:** Text must never overlap images or other text
- **No Filler Text:** "Scroll to explore", "Swipe down", scroll arrow icons, bouncing chevrons are **BANNED**
- **Asymmetric Structure:** Centered Hero layouts **BANNED** when variance exceeds 4
- **CTA Restraint:** Maximum one primary CTA. No secondary "Learn more" links

## 5. Describe Component Stylings

- **Buttons:** Flat, no outer glow. Tactile `-1px` translate on active. Accent fill for primary, ghost/outline for secondary. No custom mouse cursors
- **Cards:** Generously rounded corners (`2.5rem`). Diffused whisper shadow. Use ONLY when elevation communicates hierarchy. For high-density layouts, replace cards with border-top dividers or negative space
- **Inputs/Forms:** Label above input, helper text optional, error text below. Focus ring in accent color. No floating labels
- **Loading States:** Skeletal loaders matching layout dimensions — no generic circular spinners
- **Empty States:** Composed compositions indicating how to populate data
- **Error States:** Clear, inline error reporting

## 6. Define Layout Principles

- No overlapping elements — every element occupies its own clear spatial zone
- Centered Hero sections **BANNED** when variance exceeds 4 — force Split Screen, Left-Aligned, or Asymmetric Whitespace
- The generic "3 equal cards horizontally" feature row is **BANNED** — use 2-column Zig-Zag, asymmetric grid, or horizontal scroll
- CSS Grid over Flexbox math — never use `calc()` percentage hacks
- Contain layouts using max-width constraints (e.g., `1400px` centered)
- Full-height sections must use `min-h-[100dvh]` — never `h-screen` (iOS Safari catastrophic jump)

## 7. Define Responsive Rules

- **Mobile-First Collapse (< 768px):** All multi-column layouts collapse to single column. No exceptions
- **No Horizontal Scroll:** Horizontal overflow on mobile is a critical failure
- **Typography Scaling:** Headlines scale via `clamp()`. Body text minimum `1rem`/`14px`
- **Touch Targets:** All interactive elements minimum `44px` tap target
- **Image Behavior:** Inline typography images (photos between words) stack below headline on mobile
- **Navigation:** Desktop horizontal nav collapses to clean mobile menu
- **Spacing:** Vertical section gaps reduce proportionally (`clamp(3rem, 8vw, 6rem)`)

## 8. Encode Motion Philosophy

- **Spring Physics default:** `stiffness: 100, damping: 20` — premium, weighty feel. No linear easing
- **Perpetual Micro-Interactions:** Every active component should have an infinite loop state (Pulse, Typewriter, Float, Shimmer)
- **Staggered Orchestration:** Never mount lists instantly — use cascade delays for waterfall reveals
- **Performance:** Animate exclusively via `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`. Grain/noise filters on fixed pseudo-elements only

## 9. List Anti-Patterns (AI Tells)

Encode these as explicit **NEVER DO** rules:

- No emojis anywhere
- No Inter font
- No generic serif fonts (Times New Roman, Georgia, Garamond) — distinctive modern serifs only if needed
- No pure black (`#000000`)
- No neon/outer glow shadows
- No oversaturated accents
- No excessive gradient text on large headers
- No custom mouse cursors
- No overlapping elements — clean spatial separation always
- No 3-column equal card layouts
- No generic names ("John Doe", "Acme", "Nexus")
- No fake round numbers (99.99%, 50%)
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen")
- No filler UI text: "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons
- No broken Unsplash links — use `picsum.photos` or SVG avatars
- No centered Hero sections (for high-variance projects)

## Output Format

Write `DESIGN.md` to the project root using this structure:

```markdown
# Design System: [Project Title]

## 1. Visual Theme & Atmosphere
[Evocative description of mood, density, variance, and motion intensity]

## 2. Color Palette & Roles
- **Canvas White** (#F9FAFB) — Primary background surface
- **Pure Surface** (#FFFFFF) — Card and container fill
- **Charcoal Ink** (#18181B) — Primary text, Zinc-950 depth
- **Muted Steel** (#71717A) — Secondary text, descriptions, metadata
- **Whisper Border** (rgba(226,232,240,0.5)) — Card borders, 1px structural lines
- **[Accent Name]** (#XXXXXX) — Single accent for CTAs, active states, focus rings

## 3. Typography Rules
- **Display:** [Font Name] — Track-tight, controlled scale, weight-driven hierarchy
- **Body:** [Font Name] — Relaxed leading, 65ch max-width, neutral secondary color
- **Mono:** [Font Name] — For code, metadata, timestamps, high-density numbers
- **Banned:** Inter, generic system fonts for premium contexts. Serif fonts banned in dashboards.

## 4. Component Stylings
- **Buttons:** Flat, no outer glow. Tactile -1px translate on active. Accent fill for primary, ghost/outline for secondary.
- **Cards:** Generously rounded corners (2.5rem). Diffused whisper shadow. Used only when elevation serves hierarchy. High-density: replace with border-top dividers.
- **Inputs:** Label above, error below. Focus ring in accent color. No floating labels.
- **Loaders:** Skeletal shimmer matching exact layout dimensions. No circular spinners.
- **Empty States:** Composed, illustrated compositions — not just "No data" text.

## 5. Layout Principles
[Grid-first responsive architecture. Asymmetric splits for Hero sections.
Strict single-column collapse below 768px. Max-width containment.
No flexbox percentage math. Generous internal padding.]

## 6. Motion & Interaction
[Spring physics for all interactive elements. Staggered cascade reveals.
Perpetual micro-loops on active dashboard components. Hardware-accelerated
transforms only. Isolated Client Components for CPU-heavy animations.]

## 7. Anti-Patterns (Banned)
[Explicit list of forbidden patterns: no emojis, no Inter, no pure black,
no neon glows, no 3-column equal grids, no AI copywriting clichés,
no generic placeholder names, no broken image links.]
```

## Writing Guidelines

- **Be Descriptive:** "Deep Charcoal Ink (#18181B)" — not just "dark text"
- **Be Functional:** Explain what each element is used for
- **Be Consistent:** Same terminology throughout the document
- **Be Precise:** Include exact hex codes, rem values, pixel values in parentheses
- **Be Opinionated:** This is not a neutral template — it enforces a specific, premium aesthetic

## Common Pitfalls

- Using technical jargon without translation ("rounded-xl" instead of "generously rounded corners")
- Omitting hex codes or using only descriptive names
- Forgetting functional roles of design elements
- Being too vague in atmosphere descriptions
- Ignoring the anti-pattern list — these are what make the output premium
- Defaulting to generic "safe" designs instead of enforcing the curated aesthetic
