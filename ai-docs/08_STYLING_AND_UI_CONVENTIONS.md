# DOC_ID: AI-08_STYLING_AND_UI_CONVENTIONS
# SCOPE: Styling system, tokens, class naming, layout, responsive strategy, accessibility, asset conventions
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/styles/global.css
# - src/styles/app.css
# - src/games/number-wheel/number-wheel.css
# - src/main.tsx
# - index.html
# - src/components/Confetti.tsx
# - src/games/number-wheel/components/NumberWheel.tsx
# - public/BYekan+.ttf
# - public/favicon.svg

## Styling System

Hand-written **plain CSS**. Three stylesheets, no preprocessor, no build-time CSS tooling beyond Vite's
default handling.

| Absent | Verified by |
|---|---|
| Tailwind / any utility framework | No `tailwind.config.*`, no `postcss.config.*`, no `@tailwind` directives |
| CSS Modules | No `*.module.css` file exists |
| CSS-in-JS (styled-components, emotion, vanilla-extract) | Not in `package.json` |
| SCSS / LESS / Stylus | No `*.scss` / `*.less` files, no preprocessor dependency |
| PostCSS plugins, autoprefixer | No config file |
| A component library (MUI, Chakra, shadcn, Radix) | No dependency; every control is a hand-written `<button>` |
| An icon library | None; all glyphs are Unicode characters in JSX |

Stylesheets and their import sites:

| File | Imported by | Contains |
|---|---|---|
| `src/styles/global.css` | `src/main.tsx` (first) | `@font-face`, all `:root` design tokens, reset, kiosk `body` rules, the single global `@media (prefers-reduced-motion)` block |
| `src/styles/app.css` | `src/main.tsx` (second) | Platform-level component classes (778 lines) |
| `src/games/number-wheel/number-wheel.css` | `src/games/number-wheel/NumberWheelGame.tsx` | All game-specific classes + three game-scoped `:root` tokens (494 lines) |

Import order is load-bearing: `global.css` must come first because `app.css` and `number-wheel.css`
consume its `:root` tokens.

## Global Styles

`src/styles/global.css`:

```css
@font-face { font-family: "B Yekan"; src: url("/BYekan+.ttf") format("truetype");
             font-weight: 400; font-style: normal; font-display: swap; }
```

- `color-scheme: dark` on `:root`.
- `* { box-sizing: border-box }`.
- `html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0 }`.
- `body`: `overflow: hidden`, `overscroll-behavior: none`, `user-select: none`,
  `-webkit-tap-highlight-color: transparent`, and the font stack
  `"B Yekan", "Segoe UI", "Segoe UI Variable Display", Bahnschrift, system-ui, -apple-system,
  "Helvetica Neue", Arial, sans-serif`.
- One global media query:
  ```css
  @media (prefers-reduced-motion: reduce) {
    /* collapses animation-duration / animation-delay / transition-duration to 0.01ms !important */
  }
  ```

`index.html` sets the document-level conventions: `<html lang="fa" dir="rtl">`,
`<meta name="theme-color" content="#0a0e17">`, and a locked viewport
(`width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`).

## Theme Variables / Design Tokens

All platform tokens are CSS custom properties on `:root` in `src/styles/global.css`. There is no
light theme, no theme switcher, and no `data-theme` attribute — the kiosk is dark-only.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0a0e17` | Page background (also `theme-color`) |
| `--bg-glow` | `rgba(62, 198, 255, 0.07)` | `.app` radial-gradient accent |
| `--surface` | `#101726` | Cards, fields |
| `--surface-raised` | `#161f33` | Elevated surfaces, keys |
| `--wheel-bg` | `#0d1422` | Reel window background |
| `--wheel-bg-transparent` | `rgba(13, 20, 34, 0)` | Reel fade-gradient stop |
| `--border` | `rgba(255, 255, 255, 0.1)` | Default border |
| `--border-strong` | `rgba(255, 255, 255, 0.26)` | Selected / active border |
| `--text` | `#eaf0fa` | Primary text |
| `--text-dim` | `#8b96ac` | Secondary text, labels |
| `--accent` | `#3ec6ff` | Cyan accent: focus rings, rolling reels, links of emphasis |
| `--start` | `#26b06e` | START button fill |
| `--start-text` | `#052414` | START button label |
| `--stop` | `#e23d57` | Stop-related styling (currently unused) |
| `--gold` | `#ffc857` | Rank 1, locked reels, prize emphasis |
| `--silver` | `#c9d4e3` | Rank 2 |
| `--bronze` | `#d9a066` | Rank 3 |
| `--danger` | `#ff7b8a` | Error text and error borders |
| `--btn-min-h` | `clamp(60px, 8.5vmin, 84px)` | Minimum touch target height for `.btn` |

Game-scoped tokens declared in `src/games/number-wheel/number-wheel.css` `:root`:

| Token | Value | Role |
|---|---|---|
| `--wheel-w` | `clamp(95px, 16vmin, 180px)` | Reel width |
| `--wheel-h` | `clamp(170px, 36vmin, 340px)` | Reel window height; each digit is `calc(var(--wheel-h) / 3)` |
| `--digit-font` | `clamp(40px, 12vmin, 108px)` | Reel digit size |

Per-instance CSS variables set from JSX (the only runtime-computed CSS values):
`--drift` and `--spin` on each `.confetti__piece` (`src/components/Confetti.tsx`).

## Class Naming Conventions

BEM-ish: `block`, `block__element`, `block--modifier`. Lowercase, hyphen-separated. No CSS-Modules
hashing, no utility classes, no `is-`/`has-` state prefixes.

Examples: `.number-wheel`, `.number-wheel__strip`, `.number-wheel--rolling`,
`.leaderboard-row--gold`, `.survey__questions--skipped`, `.choice-button--selected`.

Two class families are stand-alone blocks rather than page elements: `.btn*` and `.chip*`.

Conditional classes are composed in JSX with template literals and `.filter(Boolean).join(" ")`-style
concatenation, or ternaries. There is no `clsx`/`classnames` dependency.

State that CSS reacts to is expressed as **modifier classes**, with one exception: the reduced-motion
blur suppression uses a data attribute —
`.number-wheel__strip:not([data-reduced-motion="true"])`. Note the attribute is set to `"true"` or
omitted entirely, never `"false"`.

## Utility Classes

None in the Tailwind sense. The closest things to reusable primitives, all in `src/styles/app.css`:

| Class | Purpose |
|---|---|
| `.page` | Every page root: `height: 100%`, column flex, centered, `overflow: hidden`, fluid `clamp()` padding/gap |
| `.page__title`, `.page__actions` | Page heading and bottom action row |
| `.btn` | Base touch button: `min-height: var(--btn-min-h)`, `min-width: clamp(240px, 32vmin, 340px)`, `touch-action: manipulation`, `:active { transform: scale(0.96) }`, `:focus-visible` 3px `--accent` outline, `:disabled { opacity: .35 }` |
| `.btn--primary`, `.btn--ghost`, `.btn--start`, `.btn--stop` | Button variants (`--stop` is currently unused) |
| `.chip`, `.chip--sector`, `.chip--user` | Small status pills in the game top bar |
| `.field`, `.field__*`, `.field--ltr`, `.field--active`, `.field--error` | The fake input surface family |
| `.confetti`, `.confetti__piece` | Celebration overlay |

## Component Styling Patterns

- One CSS block per component, named after the component's DOM role, defined in the stylesheet that owns
  the component's layer.
- Platform components (`pages/`, `components/`) → `src/styles/app.css`.
- Game components → the game's own stylesheet (`number-wheel.css`), which ships with the game module.
- Class-based state, not inline style objects.
- **Inline styles are used in exactly one place**: `src/components/Confetti.tsx` line 41,
  `style={piece.style}`, because each piece needs randomized per-instance values.
- **Direct DOM style mutation happens in exactly one place**:
  `src/games/number-wheel/components/NumberWheel.tsx` line 111,
  `` strip.style.transform = `translate3d(0, ${percent}%, 0)` ``, written once per animation frame to
  avoid a React render.

## Responsive Behavior

**There are no width/height breakpoints.** The only media query in the entire project is
`prefers-reduced-motion` (`src/styles/global.css:88`).

Responsiveness is achieved entirely with fluid sizing — **118 `clamp()` calls** across the three
stylesheets (`global.css` 1, `app.css` 74, `number-wheel.css` 43), predominantly using `vmin` so type and
controls scale with the smaller viewport dimension on a portrait kiosk screen.

| Aspect | Approach |
|---|---|
| Font sizes | `clamp(min, Nvmin, max)` |
| Spacing / padding / gap | `clamp(...)` |
| Touch targets | `--btn-min-h` plus per-control `min-height` |
| Reel dimensions | `--wheel-w`, `--wheel-h`, `--digit-font` |
| Grids | Fixed column counts: `.category-grid` 2 columns, `.keyboard` 3 columns — they do not reflow |
| Page height | `height: 100%` chain from `html` → `body` → `#root` → `.app` → `.page` |

Design orientation: **portrait / vertical touchscreen**. Nothing adapts to landscape.

## No-Scroll Rule

- `body { overflow: hidden; overscroll-behavior: none }`; `.app` and `.page` also `overflow: hidden`.
- The **only** scrollable region is `.leaderboard` (`overflow-y: auto`, `touch-action: pan-y`, with
  WebKit scrollbar styling).
- Any new content must fit its page or live inside a deliberately scrollable container.

## RTL / Persian Conventions

| Rule | Implementation |
|---|---|
| Document direction | `<html lang="fa" dir="rtl">` — everything inherits RTL |
| Numeric sequences stay LTR | `direction: ltr` explicitly set on `.field--ltr`, `.keyboard`, `.chip--user`, `.leaderboard__mobile`, `.wheel-group`, `.target__digits`, `.stop-dots` |
| Never add `letter-spacing` to Persian text | It breaks the joined script. `letter-spacing` appears only on Latin-digit runs: `.field--ltr .field__value` and `.leaderboard__mobile` (`1px` each) |
| Emphasis | Font weight, size, and color only |
| Persian numerals | Applied in JSX via `toPersianDigits` / `formatPersianNumber`, never via CSS |
| Mobile numbers | Rendered in **Latin** digits (the bundled font gives them Persian glyph shapes); masked on public screens |
| Thousands separator | `٬` (U+066C) substituted in `formatPersianNumber` |

Note: `.result__value` and `.result__prize` in `number-wheel.css` set `direction: rtl`. This contradicts
the stated "numeric sequences stay LTR" rule — recorded in `12_KNOWN_GAPS_AND_RISKS.md`.

## Animation Conventions

8 `@keyframes` total:

| Keyframes | File | Used by |
|---|---|---|
| `stop-attention` | `app.css:105` | `.btn--stop` — **unused** (no stop button exists) |
| `confetti-fall` | `app.css:134` | `.confetti__piece` |
| `caret-blink` | `app.css:252` | `.field__caret` |
| `wheel-active-pulse` | `number-wheel.css:192` | `.number-wheel--active` |
| `wheel-lock-pulse` | `number-wheel.css:252` | `.number-wheel--just-locked` |
| `result-fade-in` | `number-wheel.css:379` | `.result` overlay |
| `card-enter` | `number-wheel.css:403` | `.result__card` |
| `perfect-glow` | `number-wheel.css:478` | `.result__perfect-title` |

Conventions:

- Decorative motion is CSS-driven and is neutralized by the global reduced-motion block.
- Functional motion (reel spinning/settling) is JS-driven via rAF and is NOT affected by that CSS block —
  it is gated separately by the `reducedMotion` prop and `REDUCED_MOTION_SPEED_FACTOR`.
- `will-change: transform` is set on `.number-wheel__strip` only.
- Only `transform` and `opacity` are animated in hot paths.
- Spin blur is `filter: blur(1.6px)` on the strip with a `transition: filter`, suppressed via
  `data-reduced-motion`.

## Layout Patterns

| Pattern | Where |
|---|---|
| Full-height column flex, centered | `.page` (every page) |
| Bottom-docked actions | `.page__actions`, `.keyboard-dock` |
| Fixed-column CSS grid | `.category-grid` (2 cols), `.keyboard` (3 cols) |
| Positioned overlay | `.result` — `position: absolute; inset: 0; z-index: 40`, backdrop blur, inside `.game-page__stage` (`position: relative`) so it covers the game but not the host status bar |
| Row flex with gaps | `.wheel-group`, `.stop-dots`, `.choice-group`, `.game-page__topbar` |
| Layered stack for the reel | `.number-wheel__window` with absolutely positioned `__center` band and `__fade--top` / `__fade--bottom` gradient masks over the transformed `__strip` |

Only one `z-index` value of consequence: `40` on `.result`.

## Accessibility Considerations Present In Styles And Markup

- `.btn:focus-visible` — 3px `--accent` outline with offset. Focus is visible for the presenter's
  keyboard.
- Touch targets meet a `clamp(60px, 8.5vmin, 84px)` minimum height.
- `touch-action: manipulation` on tappable surfaces (suppresses double-tap zoom delay).
- `user-select: none` globally, `-webkit-tap-highlight-color: transparent`.
- Reduced-motion support at two levels: the global CSS override for decorative animation and the
  `usePrefersReducedMotion` hook for JS-driven motion (confetti suppression, blur suppression, speed
  factor).
- Semantics carried in markup, not CSS: `aria-pressed`, `role="checkbox"` + `aria-checked`,
  `role="textbox"` + `aria-label` on fake inputs, `role="alert"` on error text, `role="img"` +
  dynamic Persian labels on reels, `role="group"` with labels, `role="dialog" aria-modal="true"` on the
  result overlay, `aria-hidden="true"` on all decorative nodes.
- Color contrast is not automatically verified — `UNVERIFIED`. `--text-dim` (`#8b96ac`) on `--surface`
  (`#101726`) is the lowest-contrast pairing in use.
- No skip links, no focus trap in the result overlay (`aria-modal` is declared but focus is not
  programmatically managed) — see `12_KNOWN_GAPS_AND_RISKS.md`.

## Iconography

No icon library and no icon components. All glyphs are literal Unicode characters in JSX or CSS
`content`:

| Glyph | Where |
|---|---|
| `⌫` | Keyboard backspace key |
| `✓` | Keyboard confirm key, category card check, survey choice check, skip checkbox check |
| `▲` | `.target__digit::after` — the "tap to change" affordance, shown only when the digit button is enabled |

`public/favicon.svg` is the only vector asset.

## Asset Conventions

- Everything in `public/` is copied verbatim to the build root and referenced by absolute path.
- `public/BYekan+.ttf` → referenced as `url("/BYekan+.ttf")` from `global.css`.
- `public/favicon.svg` → referenced as `/favicon.svg` from `index.html`.
- No images are imported through the bundler; there is no `src/assets/` directory.
- No sprite sheets, no audio, no video, no JSON data files.

## Rules For Adding New Styles

1. Platform-level, reusable, or page-level styles → `src/styles/app.css`.
2. Tokens (colors, shared sizing) → `:root` in `src/styles/global.css`. Never hard-code a hex value that
   duplicates an existing token.
3. Game-specific styles → that game's own stylesheet, imported by the game's root component. Game
   stylesheets MUST NOT define platform primitives (`.btn`, `.chip`, `.page`).
4. Follow `block__element--modifier`. Prefix game-local blocks so they cannot collide with platform
   classes (all three CSS files share one global namespace).
5. **Inline styles are NOT allowed** except for genuinely per-instance computed values, following the
   `Confetti` precedent. State belongs in modifier classes.
6. **Do NOT add width/height media queries.** Use `clamp()` with `vmin` to stay consistent with the
   existing fluid-sizing approach. If a breakpoint becomes genuinely necessary, document the decision in
   `ai-docs`.
7. Never add `letter-spacing` to a selector that can contain Persian text.
8. Any element containing a numeric sequence MUST set `direction: ltr`.
9. Do not introduce page-level scrolling. `.leaderboard` is the only scrollable region.
10. New decorative animation MUST be CSS-based so the global reduced-motion override neutralizes it.
    JS-driven motion MUST honour `usePrefersReducedMotion`.
11. Animate only `transform` and `opacity` in per-frame paths.
12. Do not add a CSS framework, preprocessor, or CSS-in-JS library — the project has zero runtime
    dependencies beyond React and no CSS build step.
