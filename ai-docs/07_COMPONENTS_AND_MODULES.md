# DOC_ID: AI-07_COMPONENTS_AND_MODULES
# SCOPE: Per-file inventory of every module in src/ — exports, dependencies, side effects, importance
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/** (every file)

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
| `src/domain/user.ts` | Identity + mobile normalization/validation/masking | `User`, `MOBILE_PREFIX`, `MOBILE_DIGIT_COUNT`, `toCanonicalMobile`, `isValidMobileDigits`, `formatMobileDigits`, `formatMaskedMobile`, `makeUserId` | — | `makeUserId` uses `crypto.randomUUID` with a `Math.random`+`Date.now` fallback (the only impure function here) | YES for formatters; NO for `toCanonicalMobile` (its output is the stored identity and the anti-replay key) | `CRITICAL` |
| `src/domain/category.ts` | Sector shape | `Category` | — | none | YES | `IMPORTANT` |
| `src/domain/survey.ts` | Survey answer shape | `SurveyAnswers` | — | none | YES | `IMPORTANT` |

`isValidMobileDigits` uses `` new RegExp(`^9\\d{${MOBILE_DIGIT_COUNT - 1}}$`) `` — Iranian mobiles must
start with `9` and be exactly 10 digits. `toCanonicalMobile(digits)` → `` `${MOBILE_PREFIX}${digits}` ``.
`formatMaskedMobile(canonical)` masks digits 4–6 and regroups 3-3-4 → `912 *** 4567`.

## Services

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/services/resultRepository.ts` | Persistence **interface** | `GameResultRepository` | `src/domain/gameResult` (type) | none | NO — the seam the whole platform codes against | `CRITICAL` |
| `src/services/localResultRepository.ts` | localStorage implementation | `localResultRepository` | `src/domain/gameResult` (type) | Reads/writes `localStorage["smartis-game.results.v1"]` | YES as long as it satisfies the interface | `CRITICAL` |
| `src/services/leaderboard.ts` | Pure ranking builder | `buildLeaderboard` | `src/domain/gameResult` (types) | none | YES | `IMPORTANT` |
| `src/services/index.ts` | Implementation selector + barrel | `resultRepository`, `buildLeaderboard`, type `GameResultRepository` | the three files above | none | YES — **the single line to change for a backend implementation** | `CRITICAL` |

## Pages

| Path | Responsibility | Main exports | Imports (significant) | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/pages/RegistrationPage.tsx` | Mobile entry, validation, anti-replay, `register` | `RegistrationPage` | `src/app/AppSession`, `src/components/VirtualNumericKeyboard`, `src/domain/user`, `src/services` | `await resultRepository.getResults()`; **fails open** on throw | YES | `IMPORTANT` |
| `src/pages/SurveyPage.tsx` | Two survey questions + skip path | `SurveyPage` | `src/app/AppSession`, `src/components/VirtualNumericKeyboard`, `src/utils/persian` | none | YES | `IMPORTANT` |
| `src/pages/CategorySelectionPage.tsx` | Sector grid, single selection | `CategorySelectionPage` | `src/app/AppSession`, `src/config/appConfig` | none | YES | `IMPORTANT` |
| `src/pages/GamePage.tsx` | **The game↔platform adapter**: builds `GameContext`, widens `GameResult` → `GameSessionResult`, persists, retry/continue chrome | `GamePage` | `src/app/AppSession`, `src/config/appConfig`, `src/games/registry` (`getActiveGame`), `src/domain/*`, `src/utils/persian` | `new Date().toISOString()`; `session.submitResult` → repository | NO — it is the contract adapter; changes here affect every game and every stored record | `CRITICAL` |
| `src/pages/LeaderboardPage.tsx` | Load results, build + render ranked table | `LeaderboardPage` | `src/app/AppSession`, `src/services` (`resultRepository`, `buildLeaderboard`), `src/domain/*`, `src/utils/persian` | `resultRepository.getResults()` in `useEffect` | YES | `IMPORTANT` |

All five pages take **no props**. Each renders `.page` + its own modifier class.

`LeaderboardPage` contains commented-out "highlight my row" logic (`isMe`) — see
`12_KNOWN_GAPS_AND_RISKS.md`.

## Shared Components

| Path | Responsibility | Main exports | Imports | Side effects | Safe in isolation | Importance |
|---|---|---|---|---|---|---|
| `src/components/VirtualNumericKeyboard.tsx` | On-screen 3×4 numeric pad (replaces every real `<input>`) | `VirtualNumericKeyboard` | `react` only | none (stateless, pure callbacks) | YES | `CRITICAL` (kiosk rule: no OS keyboard) |
| `src/components/Confetti.tsx` | CSS-only celebration overlay | `Confetti` | `react` only | `Math.random` inside `useMemo` | YES | `OPTIONAL` (decorative) |

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
| `src/games/number-wheel/NumberWheelGame.tsx` | Game shell: implements `GameProps`, input model, once-only `onComplete`, layout | `NumberWheelGame` | `./config`, `./gameEngine`, `./prizeCalculator`, `./useNumberGame`, `./components/*`, `src/domain/game` (type), `src/hooks/usePrefersReducedMotion`, `./number-wheel.css` | `window` `keydown` listener (added/removed with the component); `performance.now()`; `navigator.vibrate?.()`; calls `onComplete` | NO — owns the contract and the input model | `CRITICAL` |
| `src/games/number-wheel/gameEngine.ts` | **Pure** state machine + digit/target helpers | `randomTargetNumber`, `numberToDigits`, `digitsToNumber`, `formatDigits`, `randomDigits`, `createNewGame`, `GameAction`, `createInitialSnapshot`, `gameReducer`, `rollingFlags` | `./types` (types), `./config` (none at runtime) | `Math.random` only as a **default parameter** (`rng`) | YES | `CRITICAL` |
| `src/games/number-wheel/useNumberGame.ts` | Reducer wiring + stable action creators | `useNumberGame`; re-exports `usePrefersReducedMotion` | `react`, `./gameEngine`, `./types`, `src/hooks/usePrefersReducedMotion` | none | YES | `IMPORTANT` |
| `src/games/number-wheel/prizeCalculator.ts` | **Pure** scoring + prize string | `countExactMatches`, `calculatePrizeResult`, `formatPrize` | `./config`, `./types`, `src/utils/persian` | none | YES | `CRITICAL` |
| `src/games/number-wheel/config.ts` | All game tuning constants | 13 named constants (see `05_MINIGAME.md`) | — | none | YES | `CRITICAL` |
| `src/games/number-wheel/types.ts` | Internal type vocabulary | `Digit`, `Digits`, `GameState`, `StoppedCount`, `GameSnapshot`, `WheelPrizeResult` | — | none | YES | `IMPORTANT` |
| `src/games/number-wheel/number-wheel.css` | All game-specific styles + game-scoped `:root` tokens | — | consumes tokens from `src/styles/global.css` | none | YES (class names are game-local) | `IMPORTANT` |
| `src/games/number-wheel/components/WheelGroup.tsx` | Lay out three reels; compute active index and locked flags | `WheelGroup` | `./NumberWheel`, `../types` | none | YES | `IMPORTANT` |
| `src/games/number-wheel/components/NumberWheel.tsx` | **One reel**: rAF spin loop, damped-spring settle, direct DOM transform writes, imperative digit read | `NumberWheel`, `NumberWheelHandle`, `NumberWheelProps` | `react`, `../config`, `src/utils/persian` | `requestAnimationFrame` (2 loops), `performance.now()`, `window.setTimeout`, **direct `style.transform` write** | NO — the most performance- and correctness-sensitive file in the repo | `CRITICAL` |
| `src/games/number-wheel/components/TargetDisplay.tsx` | Target readout + IDLE-only digit editor | `TargetDisplay` | `../types`, `src/utils/persian` | none | YES | `IMPORTANT` |
| `src/games/number-wheel/components/GameControls.tsx` | START button (IDLE) / progress dots (RUNNING) / nothing (RESULT) | `GameControls` | `../types` | none | YES | `SUPPORTING` |
| `src/games/number-wheel/components/ResultDisplay.tsx` | RESULT overlay: matches, prize, perfect celebration, zero-match messaging | `ResultDisplay` | `../config`, `../prizeCalculator`, `../types`, `src/components/Confetti`, `src/utils/persian` | none | YES | `IMPORTANT` |

`NumberWheel` props: `ref?: Ref<NumberWheelHandle>` (React 19 ref-as-prop, no `forwardRef`), `digit`,
`rolling`, `speed`, `locked?`, `active?`, `reducedMotion?`, `ariaLabel?`.
Handle: `{ getCurrentDigit(): number }`.

`WheelGroup` constants: `WHEEL_LABELS = ["چرخ عدد اول", "چرخ عدد دوم", "چرخ عدد سوم"]`.
`GameControls` constant: `TOTAL_WHEELS = 3`.
`ResultDisplay` constants: `ZERO_MATCH_RETRY_MESSAGE`, `ZERO_MATCH_NO_RETRY_MESSAGE`;
default `attemptsRemaining = 0`. It renders **no navigation buttons** — navigation is the host's job.

## Styles

| Path | Responsibility | Notes | Importance |
|---|---|---|---|
| `src/styles/global.css` | `@font-face "B Yekan"`, all `:root` design tokens, reset, kiosk body rules, global reduced-motion override | Imported first in `src/main.tsx`. Everything else depends on its tokens | `CRITICAL` |
| `src/styles/app.css` | Platform component styles: `.app`, `.page*`, `.btn*`, `.field*`, `.keyboard*`, survey, category, game host chrome, leaderboard, `.confetti*` | 778 lines. Shared primitives only — no game-specific rules | `CRITICAL` |

Details in `08_STYLING_AND_UI_CONVENTIONS.md`.

## Public Assets

| Path | Purpose | Notes |
|---|---|---|
| `public/BYekan+.ttf` | The Persian UI font | Registered as `"B Yekan"`, weight 400, `font-display: swap`. Only face available; heavier weights are synthesized |
| `public/favicon.svg` | Browser/tab icon | 64×64, dark rounded rect, three cyan reels, gold bar. Decorative |

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
                        hooks/usePrefersReducedMotion, components/Confetti, own files }
```

Verified: nothing under `src/games/` imports `src/app/`, `src/pages/`, or `src/services/`.
Verified: nothing under `src/domain/` imports outside `src/domain/`.
Verified: nothing under `src/services/` imports React or the DOM.
