# DOC_ID: AI-07_COMPONENTS_AND_MODULES
# SCOPE: Per-file inventory of every module in src/ — exports, dependencies, side effects, importance
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/** (every file)
# - <repo-root>/backend/main.py (the pywebview counterpart of the exporter)

Legend for **Importance**:

| Level | Meaning |
|---|---|
| `CRITICAL` | Breaking it breaks the app or the contract everything depends on |
| `IMPORTANT` | A whole feature or screen depends on it |
| `SUPPORTING` | Presentational or helper code; localized impact |
| `OPTIONAL` | Decorative or unused; removable without functional loss |

"Safe to modify in isolation" = YES means no other module's behavior changes as long as the exported
signature and the documented invariants hold.

**Export style:** every module uses **named exports**. `src/app/App.tsx` (`export default function App`)
is the ONLY default export in the repository. Props interfaces are declared locally and are NOT exported,
except `NumberWheelProps` and `NumberWheelHandle`.

## Entry & Root

| Path | Responsibility | Main exports | Imports (significant) | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/main.tsx` | Mount React onto `#root` | none (side-effect module) | `./app/App`, `./styles/global.css`, `./styles/app.css` | `document.getElementById`, `createRoot().render()`, **throws** if `#root` missing, imports global CSS | NO — CSS import order matters (`global.css` defines tokens used by `app.css`) | `CRITICAL` |
| `src/app/App.tsx` | Root component; phase→page resolution; app-wide context-menu suppression | default `App`; local `AppContent` | `./AppSession`, `./routes` | `onContextMenu` `preventDefault` | NO — owns navigation rendering | `CRITICAL` |
| `src/app/routes.tsx` | Phase→component table | `AppRoute`, `APP_ROUTES` | all 5 pages, `./AppSession` (type) | none | YES (adding/removing entries changes navigation) | `CRITICAL` |
| `src/app/AppSession.tsx` | The single session store: state, actions, Context, consumer hook | `AppPhase`, `SaveStatus`, `AppSessionProvider`, `useAppSession` | `src/config/appConfig` (`MAX_GAME_ATTEMPTS`), `src/domain/*` (types), `src/services` (`resultRepository`) | Calls `resultRepository.save`; mutates `pendingResultRef` / `savingRef`; throws in `useAppSession` outside the provider | NO — every page consumes it | `CRITICAL` |
| `src/vite-env.d.ts` | Vite client type reference (`/// <reference types="vite/client" />`) | none | — | none | YES | `SUPPORTING` (trivial, 1 line) |

## Configuration (source)

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/config/appConfig.ts` | Organizer-tunable platform settings | `ACTIVE_GAME_ID`, `MAX_GAME_ATTEMPTS`, `CATEGORIES` | `src/domain/category` (type) | none | YES for values; changing `ACTIVE_GAME_ID` to an unregistered id silently falls back to `GAME_DEFINITIONS[0]` | `CRITICAL` |

Values: `ACTIVE_GAME_ID = "number-wheel"`, `MAX_GAME_ATTEMPTS = 3`, `CATEGORIES` = 8 sectors
(`fashion`, `digital`, `sports`, `restaurant`, `entertainment`, `appliance`, `beauty`, `stationery`).

## Domain (pure — no React, no DOM, no side effects)

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/domain/game.ts` | **The pluggable-game contract** | `GameContext`, `GameResult`, `GameProps` | — | none | NO — every game and `GamePage` depend on it | `CRITICAL` |
| `src/domain/gameResult.ts` | Persisted record + leaderboard row shapes | `GameSessionResult`, `LeaderboardEntry` | — | none | NO — changing `GameSessionResult` requires updating `isGameSessionResult` in `localResultRepository.ts` | `CRITICAL` |
| `src/domain/user.ts` | Identity + mobile validation/masking | `User`, `MOBILE_DIGIT_COUNT`, `isValidMobileDigits`, `formatMobileDigits`, `formatPanelMobile`, `makeUserId` | — | `makeUserId` uses `crypto.randomUUID` with a `Math.random`+`Date.now` fallback (the only impure function here) | YES for formatters; NO for the entered-mobile-as-identity (RegistrationPage stores `mobileDigits` directly — it IS the anti-replay key) | `CRITICAL` |
| `src/domain/category.ts` | Sector shape | `Category` | — | none | YES | `IMPORTANT` |
| `src/domain/survey.ts` | Survey answer shape | `SurveyAnswers` | — | none | YES | `IMPORTANT` |

`isValidMobileDigits` uses `` new RegExp(`^09\\d{${MOBILE_DIGIT_COUNT - 2}}$`) `` — the full 11-digit
09-form (e.g. `09108086113`), stored exactly as entered with no prefix.
`formatPanelMobile(mobile)` masks the 4 middle digits → `0910****113`.

## Services

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/services/resultRepository.ts` | Persistence **interface** | `GameResultRepository` | `src/domain/gameResult` (type) | none | NO — the seam the whole platform codes against | `CRITICAL` |
| `src/services/localResultRepository.ts` | localStorage implementation | `localResultRepository` | `src/domain/gameResult` (type) | Reads/writes `localStorage["smartis-game.results.v1"]` | YES as long as it satisfies the interface | `CRITICAL` |
| `src/services/leaderboard.ts` | Pure ranking builder | `buildLeaderboard` | `src/domain/gameResult` (types) | none | YES | `IMPORTANT` |
| `src/services/gameExporter.ts` | pywebview host bridge: pushes each completed `GameSessionResult` to `window.pywebview.api.export_game_result` — the verbatim name of `Api.export_game_result` in `backend/main.py` (pywebview 6 does no camelCase conversion), which writes `backend/output/game_data_*.json` and logs to `backend/pywebview.log`. Silent no-op when the bridge is absent; `console.warn` when the bridge is present but the method is missing or the call throws — never affects the game flow | `exportGameResult` | `src/domain/gameResult` (type) | Calls the pywebview bridge (the only `window.pywebview` access in `src/`) | YES — removal only drops the disk export | `IMPORTANT` |
| `src/services/index.ts` | Implementation selector + barrel | `resultRepository`, `buildLeaderboard`, `exportGameResult`, type `GameResultRepository` | the files above | none | YES — **the single line to change for a backend implementation** | `CRITICAL` |

## Pages

| Path | Responsibility | Main exports | Imports (significant) | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/pages/RegistrationPage.tsx` | Mobile entry, validation, anti-replay, `register` | `RegistrationPage` | `src/app/AppSession`, `src/components/ui/*`, `src/domain/user`, `src/services` | `await resultRepository.getResults()`; **fails open** on throw | YES | `IMPORTANT` |
| `src/pages/SurveyPage.tsx` | Two survey questions (two local steps) + skip path | `SurveyPage` | `src/app/AppSession`, `src/components/ui/*` | none | YES | `IMPORTANT` |
| `src/pages/CategorySelectionPage.tsx` | Sector grid, single selection (redesigned page 4) | `CategorySelectionPage` | `src/app/AppSession`, `src/config/appConfig`, `src/components/ui/*` (PageShell, StepTracker, GameHeader, FloatingDecorations, NavButtons) | none | YES | `IMPORTANT` |
| `src/pages/GamePage.tsx` | **The game↔platform adapter**: builds `GameContext`, widens `GameResult` → `GameSessionResult`, persists (localStorage + pywebview disk export), retry/continue chrome; renders the game or `GameResultScreen` | `GamePage` | `src/app/AppSession`, `src/config/appConfig`, `src/games/registry` (`getActiveGame`), `src/domain/*`, `src/components/ui/*` (PageShell, GameHeader, FloatingDecorations, StepTracker), `./GameResult` | `new Date().toISOString()`; `session.submitResult` → repository; `exportGameResult` → pywebview bridge (fire-and-forget) | NO — it is the contract adapter; changes here affect every game and every stored record | `CRITICAL` |
| `src/pages/GameResult.tsx` | Host-side result screens (Figma frames 6–8): win (prize card + Confetti), loss with retries, game over | `GameResultScreen` | `react`, `src/app/AppSession` (type), `src/components/Confetti`, `src/domain/game` (type), `src/hooks/usePrefersReducedMotion`, `src/utils/persian` | none | YES — pure presentation of a `GameResult` + save status | `IMPORTANT` |

All four pages take **no props** and render inside `PageShell` (the game page with
`variant="survey"`). There is no leaderboard page — the leaderboard lives on registration
(`ui/LeaderboardPanel`); `.page` and its modifier classes were deleted with the old page.

## Shared Components

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/components/VirtualNumericKeyboard.tsx` | On-screen 3×4 numeric pad | `VirtualNumericKeyboard` | `react` only | none (stateless, pure callbacks) | YES | Retained but **unused** — redesigned pages use `ui/Keypad`/`ui/ChoiceGrid` (kiosk rule: no OS keyboard) |
| `src/components/Confetti.tsx` | CSS-only celebration overlay | `Confetti` | `react` only | `Math.random` inside `useMemo` | YES | `OPTIONAL` (decorative) |

## Shared Components — ui/ (the redesigned visual language)

Full detail in `design-system.md`. All are stateless presentation components consuming
`design-tokens.css` / `design-system.css` styles.

| Path | Responsibility | Main exports | Imports | Side effects | Importance |
|---|---|---|---|---|---|
| `src/components/ui/PageShell.tsx` | The fixed 1080×1800 design canvas (67.5rem × 112.5rem, scaled by `--s` and centered by `.app`): corner-glow lighting + edge strip, `GameHeader` slot, content frame, and the Almas credit footer pinned to the canvas bottom (one shell for all pages since 2026-08-26; footer since 2026-08-29) | `PageShell` | `react` (type) | none | `IMPORTANT` |
| `src/components/ui/StepTracker.tsx` | RTL journey tracker | `StepTracker` | `react`, `src/utils/persian` | none | `IMPORTANT` |
| `src/components/ui/GradientText.tsx` | Gradient-clipped text | `GradientText` | `react` (types) | none | `SUPPORTING` |
| `src/components/ui/LiveBadge.tsx` | «زنده» pill | `LiveBadge` | `react` only | none | `SUPPORTING` |
| `src/components/ui/PhoneDisplay.tsx` | 468×96 glass mobile display | `PhoneDisplay` | `react`, `src/utils/persian` | none | `IMPORTANT` |
| `src/components/ui/Keypad.tsx` | Redesigned LTR numeric keypad | `Keypad` | `react`, `src/utils/persian` | none | `IMPORTANT` |
| `src/components/ui/LeaderboardPanel.tsx` | «برترینهای امروز» panel | `LeaderboardPanel`, type `LeaderboardPanelEntry` | `react`, `src/domain/user`, `src/utils/persian`, `./LiveBadge` | none | `IMPORTANT` |
| `src/components/ui/GameHeader.tsx` | Shared page header (every page): Smartis logo (`public/smartis_logo.svg`) on the right (RTL) + centered tagline «تجربه هیجان در غرفه اسمارتیز» (Vazirmatn 600, letter-spacing 0) | `GameHeader` | `react` | none | `IMPORTANT` |
| `src/components/ui/FloatingDecorations.tsx` | Atmospheric emoji layer (every page; per-emoji CSS motions) | `FloatingDecorations` | `react` (types) | none | `SUPPORTING` |
| `src/components/ui/ChoiceGrid.tsx` | 2-column glass answer cards, optional full-width last card (generic over option type) | `ChoiceGrid` | `react` only | none | `IMPORTANT` |
| `src/components/ui/NavButtons.tsx` | بازگشت / ادامه pair | `NavButtons` | `react` only | none | `IMPORTANT` |

`VirtualNumericKeyboard` props: `onDigit(digit: string)`, `onBackspace()`, `onConfirm()`.
Keys: `1`–`9`, `⌫` (aria `حذف رقم`), `0`, `✓` (aria `تأیید`). Wrapper `role="group"`,
`aria-label="صفحه‌کلید عددی"`.

`Confetti` props: `count?: number` (default `64`). Per piece: random `left`, `width` `6 + rand*6` px,
`height` `size * (0.5 + rand*0.8)`, a color from a 5-entry palette, `animationDelay` `rand*0.6s`,
`animationDuration` `2.2 + rand*1.8s`, CSS vars `--drift` `(rand-0.5)*180px`, `--spin`
`(rand-0.5)*720deg`. `aria-hidden`.

## Hooks

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/hooks/usePrefersReducedMotion.ts` | Track the OS reduced-motion preference | `usePrefersReducedMotion` | `react` | `window.matchMedia` in a lazy `useState` initializer; `change` listener added/removed in `useEffect` | YES | `SUPPORTING` |

Browser-only: calling `window.matchMedia` during state initialization would throw under SSR. There is no
SSR in this project.

## Utils

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/utils/persian.ts` | Latin→Persian numeral conversion at the display layer | `toPersianDigits`, `formatPersianNumber` | — | none (pure) | YES | `IMPORTANT` |

`toPersianDigits(value: string | number)` replaces `/\d/g` with `PERSIAN_DIGITS[...]`.
`formatPersianNumber(value: number)` = `toPersianDigits(value.toLocaleString("en-US").replace(/,/g, "٬"))`
— Latin grouping first, then the Persian thousands separator `٬` (U+066C).

## Games — Registry Layer

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/games/Game.ts` | Platform side of the contract | `GameDefinition { id, name, Component: ComponentType<GameProps> }` | `src/domain/game` (type), `react` (type) | none | NO | `CRITICAL` |
| `src/games/registry.ts` | Game list + active-game resolver | `GAME_DEFINITIONS`, `getActiveGame` | `src/config/appConfig`, `src/games/Game`, `NumberWheelGame` | none | YES — **the only file to touch when adding a game** | `CRITICAL` |

`getActiveGame()` = `GAME_DEFINITIONS.find(g => g.id === ACTIVE_GAME_ID) ?? GAME_DEFINITIONS[0]`.
Games are statically imported ⇒ every registered game ships in the main bundle.

## Games — number-wheel Module

| Path | Responsibility | Main exports | Imports (significant) | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/games/number-wheel/NumberWheelGame.tsx` | Game shell: implements `GameProps`, input model, once-only `onComplete`, play-screen layout (`slot-game`: heading with tappable target, status pills, stop button, rules panel) | `NumberWheelGame` | `./config`, `./gameEngine`, `./prizeCalculator`, `./useNumberGame`, `./components/*`, `src/domain/game` (type), `src/hooks/usePrefersReducedMotion`, `src/utils/persian`, `./number-wheel.css` | `window` `keydown` listener (added/removed with the component); `performance.now()`; `navigator.vibrate?.()`; calls `onComplete` | NO — owns the contract and the input model | `CRITICAL` |
| `src/games/number-wheel/gameEngine.ts` | **Pure** state machine + digit/target helpers | `randomTargetNumber`, `numberToDigits`, `digitsToNumber`, `formatDigits`, `randomDigits`, `createNewGame`, `GameAction`, `createInitialSnapshot`, `gameReducer`, `rollingFlags` | `./types` (types), `./config` (none at runtime) | `Math.random` only as a **default parameter** (`rng`) | YES | `CRITICAL` |
| `src/games/number-wheel/useNumberGame.ts` | Reducer wiring + stable action creators | `useNumberGame`; re-exports `usePrefersReducedMotion` | `react`, `./gameEngine`, `./types`, `src/hooks/usePrefersReducedMotion` | none | YES | `IMPORTANT` |
| `src/games/number-wheel/prizeCalculator.ts` | **Pure** scoring + prize string | `countExactMatches`, `calculatePrizeResult`, `formatPrize` (currently unused — the redesigned UI formats amounts via `formatPersianNumber` in the host) | `./config`, `./types`, `src/utils/persian` | none | YES | `CRITICAL` |
| `src/games/number-wheel/config.ts` | All game tuning constants | 13 named constants (see `05_MINIGAME.md`) | — | none | YES | `CRITICAL` |
| `src/games/number-wheel/types.ts` | Internal type vocabulary | `Digit`, `Digits`, `GameState`, `StoppedCount`, `GameSnapshot`, `WheelPrizeResult` | — | none | YES | `IMPORTANT` |
| `src/games/number-wheel/number-wheel.css` | All game-specific styles + game-scoped `:root` tokens | — | consumes tokens from `src/styles/global.css` | none | YES (class names are game-local) | `IMPORTANT` |
| `src/games/number-wheel/components/WheelGroup.tsx` | Lay out three reels; compute active index and locked flags | `WheelGroup` | `./NumberWheel`, `../types` | none | YES | `IMPORTANT` |
| `src/games/number-wheel/components/NumberWheel.tsx` | **One reel**: rAF spin loop, damped-spring settle, direct DOM transform writes, imperative digit read | `NumberWheel`, `NumberWheelHandle`, `NumberWheelProps` | `react`, `../config`, `src/utils/persian` | `requestAnimationFrame` (2 loops), `performance.now()`, `window.setTimeout`, **direct `style.transform` write** | NO — the most performance- and correctness-sensitive file in the repo | `CRITICAL` |
(The `TargetDisplay`, `GameControls`, and `ResultDisplay` components were **deleted** in the page
redesign — the target editor + stop button moved into `NumberWheelGame.tsx`, and the result screens
live in the host at `src/pages/GameResult.tsx`.)

`NumberWheel` props: `ref?: Ref<NumberWheelHandle>` (React 19 ref-as-prop, no `forwardRef`), `digit`,
`rolling`, `speed`, `locked?`, `active?`, `reducedMotion?`, `ariaLabel?`.
Handle: `{ getCurrentDigit(): number }`.

`WheelGroup` renders the three reels; the «رقم ۱/۲/۳» labels are hard-coded in `NumberWheelGame`
(`reel-labels` row, LTR).

## Styles

| Path | Responsibility | Notes | Importance |
|---|---|---|---|
| `src/styles/global.css` | `@font-face "B Yekan"`, all `:root` design tokens, reset, kiosk body rules, global reduced-motion override | Imported first in `src/main.tsx`. Everything else depends on its tokens | `CRITICAL` |
| `src/styles/app.css` | Platform component styles: `.app`, `.keyboard*`, `.confetti*` | Shared primitives only — no game-specific rules. The legacy survey/category styles, the old game-page chrome (`.btn--start`/`.btn--stop`, `.chip*`, statusbar), and the leaderboard page's `.page*`/`.btn*`/`.leaderboard*`/`.rank-badge*` rules were removed with the redesigns (the leaderboard page itself was deleted 2026-08-26); the game page's styles live in `number-wheel.css` + `design-system.css` | `CRITICAL` |
| `src/styles/design-tokens.css` | The redesigned visual language's token set (`--ds-*`), `@font-face` for IRANYekanXFaNum/Vazirmatn, + the scaled root font-size | Imported after `global.css`. The single source of truth for the redesign | `IMPORTANT` |
| `src/styles/design-system.css` | Component styles for `src/components/ui/` (page shell, tracker, keypad, panels) **and the host-side result screens** (`.game-result*`, `.result-digit*`, `.result-action*`) | Consumes only `--ds-*` tokens; all fixed dimensions in rem | `IMPORTANT` |

`src/app/designScale.ts` exports `DESIGN_WIDTH` / `DESIGN_HEIGHT` and `applyDesignScale()`
(called in `src/main.tsx`), which sets `--s` on `<html>`; the redesign's rem-based sizing scales
off it. The fixed-canvas tokens `--ds-canvas-w` / `--ds-canvas-h` in `design-tokens.css` mirror the
two constants, and `.app` centers the canvas in the viewport. Full detail in `design-system.md`.

Details in `08_STYLING_AND_UI_CONVENTIONS.md`.

## Public Assets

| Path | Purpose | Notes |
|---|---|---|
| `public/BYekan+.ttf` | Legacy Persian UI font | Registered as `"B Yekan"` in `global.css`, weight 400; heavier weights synthesized. The redesigned pages use the fonts below instead |
| `public/fonts/Vazirmatn/` | Bundled body font (Regular/Medium/SemiBold/Bold TTFs) | Registered in `design-tokens.css` as `--ds-font-body` "Vazirmatn" |
| `public/favicon.svg` | Browser/tab icon | 64×64, dark rounded rect, three cyan reels, gold bar. Decorative |

(Orbitron — `--ds-font-logo` — is **not present on disk**; the stack falls back to Bahnschrift.
`public/fonts/Orbitron/` and `public/stores/` are untracked additions.)

## Trivial / Non-Application Files

| Path | Status |
|---|---|
| `src/vite-env.d.ts` | Trivial — single `/// <reference types="vite/client" />` |
| `.claude/settings.local.json` | Tooling only (Claude Code permission allow-list). No secrets. Not application code |
| `.cdp-retry.cjs` | Git-ignored, untracked local verification driver (headless Chrome over CDP). Its header marks it temporary. NOT application code; MUST NOT be imported |
| `dist/`, `node_modules/`, `*.tsbuildinfo` | Generated. Do not read or edit |

No file in `src/` is generated or machine-authored.

## Dependency Direction Summary

```
main.tsx → app/ → pages/ → { components/, hooks/, utils/, services/, games/registry }
                              │                              │
                              └──────────► domain/ ◄─────────┘
games/number-wheel/ → { react, domain/game (types), utils/persian,
                        hooks/usePrefersReducedMotion, own files }
```

Verified: nothing under `src/games/` imports `src/app/`, `src/pages/`, or `src/services/`.
Verified: nothing under `src/domain/` imports outside `src/domain/`.
Verified: nothing under `src/services/` imports React or the DOM.
