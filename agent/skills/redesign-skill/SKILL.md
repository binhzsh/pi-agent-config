---
name: redesign-skill
description: |-
  Audit and upgrade existing UIs to premium visual quality without breaking
  functionality. Identifies generic AI design patterns, weak typography, flat
  layouts, missing states, and cliché component patterns — then applies targeted
  fixes using the existing stack. Use proactively when asked to "redesign this
  page", "make this look better", "improve the UI", "polish the design", or
  "this looks too generic".

  Examples:
  - user: "Redesign this landing page" → scan, diagnose, apply targeted upgrades
  - user: "This looks too AI-generated" → remove generic patterns, add character
  - user: "Make this dashboard look premium" → typography, spacing, states
  - user: "Improve the visual design of this component" → audit + surgical fixes
  - user: "Polish the UI" → hover states, loading/empty/error states, micro-copy
---

# Redesign Skill

Upgrade existing interfaces to premium quality. Work with the existing stack —
never rewrite from scratch.

## Workflow

1. **Scan** — Read the codebase. Identify the framework, styling method
   (Tailwind, vanilla CSS, styled-components, etc.), and current design patterns.
2. **Diagnose** — Run the audit below. List every generic pattern, weak point,
   and missing state.
3. **Fix** — Apply targeted upgrades in priority order. Improve what's there.

## Rules

- Work with the existing tech stack. Do not migrate frameworks or styling libraries.
- Do not break existing functionality. Verify after every change.
- Before importing any new library, check the project's dependency file first.
- If the project uses Tailwind, check the version (v3 vs v4) before modifying config.
- Keep changes reviewable and focused. Small, targeted improvements over big rewrites.

## Fix Priority

Apply in this order for maximum visual impact with minimum risk:

1. **Font swap** — biggest instant improvement, lowest risk
2. **Color palette cleanup** — remove clashing or oversaturated colors
3. **Hover and active states** — makes the interface feel alive
4. **Layout and spacing** — proper grid, max-width, consistent padding
5. **Replace generic components** — swap cliché patterns for modern alternatives
6. **Add loading, empty, and error states** — makes it feel finished
7. **Polish typography scale and spacing** — the premium final touch

## Design Audit

### Typography

- **Browser defaults or Inter everywhere.** Swap for a font with character:
  `Geist`, `Outfit`, `Cabinet Grotesk`, `Satoshi`. For editorial projects, pair
  serif header with sans-serif body.
- **Headlines lack presence.** Increase size, tighten letter-spacing, reduce
  line-height. Headlines should feel heavy and intentional.
- **Body text too wide.** Limit to ~65 characters. Increase line-height.
- **Only Regular (400) and Bold (700).** Introduce Medium (500) and SemiBold (600).
- **Numbers in proportional font.** Use `font-variant-numeric: tabular-nums` for
  data-heavy interfaces.
- **Missing letter-spacing.** Negative tracking for large headers, positive for
  small caps/labels.
- **All-caps subheaders everywhere.** Try lowercase italics, sentence case, or
  small-caps.
- **Orphaned words.** Fix with `text-wrap: balance` or `text-wrap: pretty`.

### Color and Surfaces

- **Pure `#000000` background.** Replace with off-black or tinted dark
  (`#0a0a0a`, `#121212`, dark navy).
- **Oversaturated accents.** Keep saturation below 80%.
- **More than one accent color.** Pick one. Remove the rest.
- **Mixing warm and cool grays.** Stick to one gray family.
- **Purple/blue "AI gradient" aesthetic.** Replace with neutral base + single
  considered accent.
- **Generic `box-shadow`.** Tint shadows to match background hue.
- **Flat design with zero texture.** Add subtle noise, grain, or micro-patterns.
- **Perfectly even gradients.** Use radial gradients, noise overlays, or mesh
  gradients instead of linear 45°.
- **Inconsistent lighting direction.** All shadows should suggest one light source.
- **Random dark sections in light mode (or vice versa).** Commit to a consistent
  background tone. Use slightly darker shades of the same palette for contrast.
- **Empty, flat sections with no depth.** Add background imagery (blurred,
  overlaid, or masked), subtle patterns, or ambient gradients.

### Layout

- **Everything centered and symmetrical.** Break symmetry with offset margins,
  mixed aspect ratios, left-aligned headers over centered content.
- **Three equal card columns.** This is the most generic AI layout. Replace with
  2-column zig-zag, asymmetric grid, horizontal scroll, or masonry.
- **`height: 100vh` for full-screen sections.** Use `min-height: 100dvh` to
  prevent layout jumping on mobile (iOS Safari viewport bug).
- **Complex flexbox percentage math.** Replace with CSS Grid.
- **No max-width container.** Add ~1200–1440px container with auto margins.
- **Cards of equal height forced by flexbox.** Allow variable heights or use
  masonry when content varies.
- **Uniform border-radius on everything.** Vary: tighter on inner elements,
  softer on containers.
- **No overlap or depth.** Use negative margins for layering.
- **Symmetrical vertical padding.** Adjust optically — bottom often needs more.
- **Dashboard always has a left sidebar.** Try top nav, floating command menu,
  or collapsible panel.
- **Missing whitespace.** Double the spacing. Dense layouts are for dashboards,
  not marketing pages.
- **Buttons not bottom-aligned in card groups.** Pin CTAs to the bottom of each
  card so they form a clean horizontal line.
- **Feature lists starting at different vertical positions.** In pricing/comparison
  cards, align lists at the same Y position across columns.
- **Inconsistent vertical rhythm in side-by-side elements.** Align shared elements
  (titles, descriptions, prices, buttons) across all items.
- **Mathematical alignment that looks optically wrong.** Centering by math doesn't
  always look centered. Icons next to text, play buttons in circles, text in
  buttons often need 1–2px optical adjustments.

### Interactivity and States

- **No hover states on buttons.** Add background shift, slight scale, or translate.
- **No active/pressed feedback.** Add `scale(0.98)` or `translateY(1px)` on press.
- **Instant transitions with zero duration.** Add 200–300ms transitions.
- **Missing focus ring.** Visible focus indicators are an accessibility requirement.
- **No loading states.** Replace generic spinners with skeleton loaders matching
  the layout shape.
- **No empty states.** Design a composed "getting started" view.
- **No error states.** Add clear inline error messages. Never `window.alert()`.
- **Dead links.** Buttons linking to `#` — either link to real destinations or
  visually disable them.
- **No indication of current page in navigation.** Style the active nav link.
- **Scroll jumping.** Add `scroll-behavior: smooth`.
- **Animations using `top`, `left`, `width`, `height`.** Switch to `transform`
  and `opacity` for GPU-accelerated animation.

### Content

- **Generic names like "John Doe".** Use diverse, realistic-sounding names.
- **Fake round numbers like `99.99%`, `$100.00`.** Use organic data:
  `47.2%`, `$99.00`, `+1 (312) 847-1928`.
- **Placeholder company names like "Acme Corp", "Nexus", "SmartFlow".** Invent
  contextual, believable brands.
- **AI copywriting clichés.** Never use "Elevate", "Seamless", "Unleash",
  "Next-Gen", "Game-changer", "Delve", "Tapestry", or "In the world of...".
  Write plain, specific language.
- **Exclamation marks in success messages.** Remove them. Be confident, not loud.
- **"Oops!" error messages.** Be direct: "Connection failed. Please try again."
- **Passive voice.** Use active voice.
- **All blog post dates identical.** Randomize dates.
- **Same avatar for multiple users.** Use unique assets per person.
- **Lorem Ipsum.** Never use placeholder Latin text. Write real draft copy.
- **Title Case On Every Header.** Use sentence case.

### Component Patterns

- **Generic card (border + shadow + white bg).** Remove the border, or use only
  background color, or only spacing. Cards should exist only when elevation
  communicates hierarchy.
- **Always one filled + one ghost button.** Add text links or tertiary styles.
- **Pill-shaped "New" and "Beta" badges.** Try square badges, flags, or plain text.
- **Accordion FAQ sections.** Use side-by-side list, searchable help, or inline
  progressive disclosure.
- **3-card carousel testimonials with dots.** Replace with masonry wall, embedded
  social posts, or single rotating quote.
- **Pricing table with 3 towers.** Highlight the recommended tier with color and
  emphasis, not just extra height.
- **Modals for everything.** Use inline editing, slide-over panels, or expandable
  sections for simple actions.
- **Avatar circles exclusively.** Try squircles or rounded squares.
- **Light/dark toggle always sun/moon.** Use dropdown, system preference detection,
  or integrate into settings.
- **Footer link farm with 4 columns.** Simplify. Focus on main paths and legal links.

### Iconography

- **Lucide or Feather icons exclusively.** These are the default AI choice. Use
  Phosphor, Heroicons, or a custom set for differentiation.
- **Rocketship for "Launch", shield for "Security".** Replace with less cliché
  icons (bolt, fingerprint, spark, vault).
- **Inconsistent stroke widths.** Standardize to one weight.
- **Missing favicon.** Always include a branded favicon.
- **Stock "diverse team" photos.** Use real photos, candid shots, or consistent
  illustration style.

### Code Quality

- **Div soup.** Use semantic HTML: `<nav>`, `<main>`, `<article>`, `<aside>`,
  `<section>`.
- **Inline styles mixed with CSS classes.** Move all styling to the project's
  styling system.
- **Hardcoded pixel widths.** Use relative units (`%`, `rem`, `em`, `max-width`).
- **Missing alt text on images.** Describe content. Never `alt="image"` on
  meaningful images.
- **Arbitrary z-index like `9999`.** Establish a clean z-index scale.
- **Commented-out dead code.** Remove all debug artifacts.
- **Import hallucinations.** Check that every import exists in dependencies.
- **Missing meta tags.** Add `<title>`, `description`, `og:image`, social sharing.

### Strategic Omissions (What AI Typically Forgets)

- **No legal links.** Add privacy policy and terms of service in the footer.
- **No "back" navigation.** Every page needs a way back.
- **No custom 404 page.** Design a helpful, branded "page not found" experience.
- **No form validation.** Add client-side validation for emails, required fields,
  and format checks.
- **No "skip to content" link.** Essential for keyboard users.
- **No cookie consent.** If required by jurisdiction, add a compliant banner.

## Upgrade Techniques

### Typography Upgrades

- **Variable font animation.** Interpolate weight or width on scroll/hover.
- **Outlined-to-fill transitions.** Text starts as stroke outline, fills on
  scroll entry or interaction.
- **Text mask reveals.** Large typography as a window to video/imagery behind.

### Layout Upgrades

- **Broken grid / asymmetry.** Elements that deliberately ignore columns —
  overlapping, bleeding off-screen, or offset with calculated randomness.
- **Whitespace maximization.** Aggressive negative space to focus on one element.
- **Parallax card stacks.** Sections that stick and stack over each other during
  scroll.
- **Split-screen scroll.** Two halves sliding in opposite directions.

### Motion Upgrades

- **Smooth scroll with inertia.** Heavier, cinematic feel.
- **Staggered entry.** Elements cascade in with slight delays — Y-axis translation
  + opacity fade. Never mount everything at once.
- **Spring physics.** Replace linear easing with spring-based motion.
- **Scroll-driven reveals.** Content entering through expanding masks, wipes,
  or draw-on SVG paths tied to scroll progress.

### Surface Upgrades

- **True glassmorphism.** Beyond `backdrop-filter: blur` — add 1px inner border
  and subtle inner shadow for edge refraction.
- **Spotlight borders.** Card borders that illuminate under the cursor.
- **Grain and noise overlays.** Fixed, pointer-events-none overlay to break
  digital flatness.
- **Colored, tinted shadows.** Shadows carrying the hue of the background.
