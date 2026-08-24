# DOC_ID: AI-03_ARCHITECTURE
# SCOPE: Entry point, boot sequence, layering, game integration, state ownership, side-effect boundaries
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - index.html
# - src/main.tsx
# - src/app/App.tsx
# - src/app/AppSession.tsx
# - src/app/routes.tsx
# - src/pages/GamePage.tsx
# - src/games/registry.ts
# - src/games/Game.ts
# - src/domain/game.ts
# - src/services/index.ts

## Entry Point

`index.html` → `<script type="module" src="/src/main.tsx">` → `src/main.tsx`.

## Boot Sequence (exact)

1. `src/main.tsx` imports `App` from `./app/App`, then `./styles/global.css`, then `./styles/app.css`.
   CSS import order is meaningful: `global.css` declares the `@font-face` and every `:root` token that
   `app.css` and `number-wheel.css` consume.
2. `document.getElementById("root")`; if null, **throws** `Error("Root element #root not found")`.
   There is no fallback and no error boundary — a missing `#root` is a hard boot failure.
3. `createRoot(root).render(<StrictMode><App /></StrictMode>)`.
   `StrictMode` is active, so in development every effect mounts, unmounts, and remounts once.
4. `App` renders `<AppSessionProvider><AppContent /></AppSessionProvider>`.
5. `AppSessionProvider` initializes `SessionState` to `{ phase: "REGISTRATION", user: null, category: null, survey: null, attempt: 1, saveStatus: "idle", savedResult: null }`.
6. `AppContent` reads `phase`, looks it up in `APP_ROUTES`, and renders that route's `component`
   inside `<div className="app" onContextMenu={preventDefault}>`.
7. `src/games/number-wheel/number-wheel.css` is imported by `NumberWheelGame.tsx`, so the game
   stylesheet loads with the game module (statically bundled — there is no dynamic import).

## Rendering Flow

```
index.html #root
└── StrictMode
    └── App                                (src/app/App.tsx)
        └── AppSessionProvider             (src/app/AppSession.tsx) — Context value
            └── AppContent                 (src/app/App.tsx) — consumes `phase`
                └── div.app                (context menu suppressed)
                    └── <Page />           one of APP_ROUTES[i].component
```

`AppContent` re-renders on every session-state change and swaps the whole page subtree when `phase`
changes. Page components are **not** memoized and are **not** lazy-loaded.

## Routing Flow

There is no router library, no URL segment, no `history` interaction, no deep linking.

- `AppPhase = "REGISTRATION" | "SURVEY" | "CATEGORY" | "GAME" | "LEADERBOARD"` (`src/app/AppSession.tsx`).
- `APP_ROUTES: readonly AppRoute[]` (`src/app/routes.tsx`) maps each phase to `{ id, label, component }`.
  `label` is a Persian string documented as being for accessible announcements; **no component currently
  reads `label`** (`INFERRED`: reserved for future use).
- Lookup: `APP_ROUTES.find(entry => entry.id === phase) ?? APP_ROUTES[0]` — an unknown phase falls back
  to registration.
- Transitions are only possible through the session action functions (see below). Pages never set
  `phase` directly.

Allowed transitions (each is exactly one session action):

| From | Action | To | Guard |
|---|---|---|---|
| `REGISTRATION` | `register(user)` | `SURVEY` | none (resets the entire session state) |
| `SURVEY` | `completeSurvey(survey)` | `CATEGORY` | no-op unless `user` is set |
| `CATEGORY` | `selectCategory(category)` | `GAME` | no-op unless `user` is set |
| `GAME` | `retry()` | `GAME` (attempt + 1) | no-op unless `user` set, `saveStatus === "saved"`, `attempt < MAX_GAME_ATTEMPTS` |
| `GAME` | `goToLeaderboard()` | `LEADERBOARD` | none |
| any | `startNewUser()` | `REGISTRATION` | none (full reset) |

`onExit` passed to the game is wired directly to `session.startNewUser` (`src/pages/GamePage.tsx`), so
the game's «خروج» button abandons the whole session.

## Layering And Dependency Direction

```
             ┌──────────────────────────────┐
             │ app/ (session + route table) │
             └──────────────┬───────────────┘
                            │
                     ┌──────▼──────┐
                     │   pages/    │  ← the only layer that may touch both session and services
                     └──┬───┬───┬──┘
        ┌───────────────┘   │   └──────────────┐
        ▼                   ▼                  ▼
   components/          services/          games/registry
   hooks/ utils/      (persistence)              │
        │                   │                    ▼
        └────────► domain/ ◄┘            games/number-wheel/  ← may import domain/, components/, hooks/, utils/
                 (pure types)                                   MUST NOT import app/, pages/, services/
```

Verified import facts:

- `src/domain/*` imports nothing outside `src/domain/` (only `category.ts` is cross-imported).
- `src/services/*` imports only `src/domain/gameResult.ts` and its own siblings.
- `src/games/number-wheel/**` imports only: `react`, `src/domain/game.ts` (types), `src/utils/persian.ts`,
  `src/hooks/usePrefersReducedMotion.ts`, `src/components/Confetti.tsx`, and its own files.
  It imports **no** page, **no** service, and **not** `AppSession`.
- `src/games/registry.ts` imports `src/config/appConfig.ts` and the game component — this is the seam.
- `src/pages/GamePage.tsx` imports `getActiveGame()`; it never imports a concrete game.

## Game Integration Architecture

The contract lives in two files:

| Side | File | Exports |
|---|---|---|
| Game side | `src/domain/game.ts` | `GameContext`, `GameResult`, `GameProps` |
| Platform side | `src/games/Game.ts` | `GameDefinition { id, name, Component: ComponentType<GameProps> }` |

Wiring:

1. `src/games/registry.ts` holds `GAME_DEFINITIONS: readonly GameDefinition[]` (currently one entry:
   `{ id: "number-wheel", name: "بازی اعداد", Component: NumberWheelGame }`).
2. `getActiveGame()` returns `GAME_DEFINITIONS.find(g => g.id === ACTIVE_GAME_ID) ?? GAME_DEFINITIONS[0]`.
   An unknown `ACTIVE_GAME_ID` silently falls back to the first entry.
3. `GamePage` calls `getActiveGame()` on every render, takes `.Component`, and renders it with
   `key={`${user.id}:${attempt}`}`, `context`, `onComplete`, `onExit`.
4. The `key` is the reset mechanism: a new user or a new attempt **unmounts and remounts** the game,
   producing a fresh reducer state, fresh target, fresh refs. There is no in-game "play again".

`GamePage` is the **only** adapter. It:
- narrows platform state into `GameContext` (`useMemo` over `[user, category, attempt]`),
- widens `GameResult` into `GameSessionResult` (adds `userId`, `mobile`, survey answers, `attempt`,
  `sectorId`, `sectorName`, `gameId`, `playedAt`),
- hands the record to `session.submitResult`,
- renders its own status bar / retry / continue controls **outside** the game subtree.

The game never learns whether persistence succeeded.

## State Ownership

| Owner | State | Scope |
|---|---|---|
| `AppSessionProvider` (`src/app/AppSession.tsx`) | `phase`, `user`, `category`, `survey`, `attempt`, `saveStatus`, `savedResult` | whole app, one attendee session |
| `AppSessionProvider` refs | `pendingResultRef`, `savingRef` | not rendered; retry payload + concurrency guard |
| `RegistrationPage` | `mobileDigits`, `error`, `checking` | local, discarded on unmount |
| `SurveyPage` | `countFocused`, `countDigits`, `hasBenefits`, `countError`, `benefitsError`, `notEmployed` | local, discarded on unmount |
| `CategorySelectionPage` | `selectedId` | local |
| `LeaderboardPage` | `loadState`, `entries` | local, loaded once on mount |
| `GamePage` ref | `submittedRef` | duplicate-submit guard, reset by `handleRetry` |
| `useNumberGame` reducer | `GameSnapshot { phase, stoppedCount, target, digits }` | one mounted game instance |
| `NumberWheelGame` refs | `wheelRefs[3]`, `lastStopAt`, `completedRef` | imperative reel access, debounce, once-only completion |
| `NumberWheel` refs | `positionRef`, `wasRollingRef`, `stripRef` | per-reel animation state, **outside React state** |
| `NumberWheel` state | `justLocked` (boolean) | the only React state a reel owns |

Nothing is duplicated between pages: pages read shared facts from `useAppSession()`.

Full detail: `06_STATE_AND_DATA_FLOW.md`.

## Side-Effect Boundaries

| Effect | Where it is allowed to happen | Notes |
|---|---|---|
| `localStorage` read/write | `src/services/localResultRepository.ts` only | The only storage access in the repository |
| Repository calls | `src/app/AppSession.tsx` (`submitResult`, `retrySave`), `src/pages/RegistrationPage.tsx` (anti-replay `getResults`), `src/pages/LeaderboardPage.tsx` (`getResults`) | Games never call the repository |
| `requestAnimationFrame` loops | `src/games/number-wheel/components/NumberWheel.tsx` only | Two loops; both cancelled in cleanup |
| Direct DOM mutation | `NumberWheel.writeTransform` writing `strip.style.transform` | The only direct DOM write in the app |
| `window` event listener | `NumberWheelGame.tsx` (`keydown`) | Game-scoped: added on mount, removed on unmount |
| `matchMedia` listener | `src/hooks/usePrefersReducedMotion.ts` | |
| Timers | `NumberWheel.tsx` (`window.setTimeout` for the lock pulse) | Cleared in cleanup |
| Haptics | `NumberWheelGame.handleStop` → `navigator.vibrate?.()` | Optional-call, no feature detection needed |
| `crypto.randomUUID` | `src/domain/user.ts` `makeUserId()` | Falls back to `Math.random` + `Date.now` |
| `new Date().toISOString()` | `src/pages/GamePage.tsx` | The only timestamp source |
| Randomness | `Math.random` via `gameEngine` defaults, and `Confetti.tsx` | See "Randomness" in `05_MINIGAME.md` |

There are **no** network requests anywhere in `src/`.

## Data Flow: User Input → UI/Game Response

**Registration**
`VirtualNumericKeyboard` key press → `appendDigit` (caps at 10 digits) → `mobileDigits` state →
`formatMobileDigits` renders `912 123 4567` → «ورود» → `isValidMobileDigits` (`/^9\d{9}$/`) →
`toCanonicalMobile` → `resultRepository.getResults()` → if any `result.mobile === canonical` show
`ALREADY_PLAYED_MESSAGE` and stop; on repository throw, **fail open** and register anyway →
`register({ id: makeUserId(), mobile: canonical })` → phase `SURVEY`.

**Survey**
Digits → `countDigits` (max 6 chars) → `count = parseInt(countDigits, 10)`.
`بله`/`خیر` → `hasBenefits`, and also sets `countFocused = false` (hides the keyboard).
Skip checkbox → `notEmployed`; submitting while checked stores `{ employeeCount: 0, hasBenefits: false }`.
Otherwise validation requires a non-empty count, `count !== 0`, and a non-null `hasBenefits`.
→ `completeSurvey(answers)` → phase `CATEGORY`.

**Category**
Card tap → `selectedId` → «ادامه» enabled → `selectCategory(category)` → phase `GAME`.

**Game**
`GamePage` builds `context` and mounts the game keyed by `user.id:attempt`.
Touch «شروع» or presenter key → `START` → reducer `phase: "RUNNING"` → `rollingFlags` → each
`NumberWheel` starts its rAF spin loop.
Presenter key (or any of the action keys) → `handleStop` → debounce via `MIN_STOP_INTERVAL_MS` →
read the live digit from `wheelRefs[stoppedCount].current.getCurrentDigit()` → `navigator.vibrate` →
`STOP { lockedDigit }` → reducer writes `digits[stoppedCount]` and increments `stoppedCount`; the third
STOP sets `phase: "RESULT"`.
`RESULT` → ref-guarded effect → `calculatePrizeResult(target, digits)` →
`onComplete({ score: prize, winAmount: prize, metadata: { target, finalNumber, correctDigits, perfect } })`
→ `GamePage.handleComplete` builds `GameSessionResult` → `session.submitResult` → `saveStatus`
`saving` → `saved` | `error` → host status bar renders retry-save / retry-game / continue.

**Leaderboard**
Mount → `resultRepository.getResults()` → `buildLeaderboard(results)` → table rows.
«کاربر جدید» → `startNewUser()` → phase `REGISTRATION`, everything cleared.

## Important Architectural Boundaries

1. **Game ↔ platform**: only `GameProps`. A game that needs more platform data must extend
   `GameContext` in `src/domain/game.ts` and have `GamePage` populate it.
2. **Persistence**: only `GameResultRepository`. UI code must never touch `localStorage`.
3. **Purity**: `src/domain/`, `src/services/leaderboard.ts`, `src/games/number-wheel/gameEngine.ts`,
   `src/games/number-wheel/prizeCalculator.ts`, and `src/utils/persian.ts` are React-free and
   DOM-free. Keep them that way — they are the testable core (no tests exist yet).
4. **Animation ↔ React**: reel motion lives in refs and direct `style.transform` writes. React must not
   re-render per frame. The reducer only learns the digit that was showing at the instant STOP fired.
5. **Styling**: platform primitives in `src/styles/app.css`; game-specific rules in the game's own
   stylesheet.

## Design Decisions

| Decision | Label | Evidence |
|---|---|---|
| Pluggable-game contract as the core abstraction | `EXPLICIT` | `README.md` "Pluggable games — the core contract"; `src/domain/game.ts` doc comment |
| Game must not know about registration/categories/navigation/storage/billing/leaderboard | `EXPLICIT` | `src/domain/game.ts` doc comment |
| `onComplete` exactly once | `EXPLICIT` | `src/domain/game.ts` doc comment; `completedRef` + `submittedRef` |
| No in-game replay; reset by remount via `key` | `EXPLICIT` | `src/games/number-wheel/useNumberGame.ts` and `gameEngine.ts` doc comments; `src/pages/GamePage.tsx` comment |
| Phase switch instead of a router | `EXPLICIT` | `src/app/routes.tsx` doc comment; `CLAUDE.md` |
| Single session store, nothing duplicated between pages | `EXPLICIT` | `src/app/AppSession.tsx` doc comment |
| Repository interface so a backend can replace localStorage without touching UI | `EXPLICIT` | `src/services/resultRepository.ts`, `src/services/index.ts`, `src/services/localResultRepository.ts` doc comments |
| Prizes only for exact positional matches | `EXPLICIT` | `src/games/number-wheel/config.ts` and `prizeCalculator.ts` comments |
| Reel transform written to the DOM per frame so React never re-renders while spinning | `EXPLICIT` | `src/games/number-wheel/components/NumberWheel.tsx` doc comment |
| No real `<input>` so the OS keyboard never appears | `EXPLICIT` | `src/components/VirtualNumericKeyboard.tsx`, `src/pages/RegistrationPage.tsx` comments; `src/styles/app.css` comment |
| Persian numerals converted at display layer only | `EXPLICIT` | `src/utils/persian.ts` doc comment; `CLAUDE.md` |
| Mobile number as the sole identity (no names collected) | `EXPLICIT` | `src/domain/user.ts` doc comment |
| STOP is presenter-keyboard-only; no on-screen stop button | `EXPLICIT` | `src/games/number-wheel/components/GameControls.tsx` and `NumberWheelGame.tsx` comments |
| Retry offered only after a zero-win result, capped by `MAX_GAME_ATTEMPTS` | `EXPLICIT` | `src/config/appConfig.ts` comment; `GamePage.canRetry` |
| Anti-replay check fails open | `EXPLICIT` | `src/pages/RegistrationPage.tsx` comment |
| One Context provider rather than a state library | `INFERRED` | Only `AppSessionContext` exists; zero external state deps |
| Pure-core / imperative-shell split (`gameEngine` + `prizeCalculator` pure, components effectful) | `INFERRED` | Consistent across the game module; doc comments call the engine "pure" |
| `AppRoute.label` reserved for future accessible announcements | `INFERRED` | Declared and documented but never read |
| Deployment target | `UNKNOWN` | No CI, host config, or deploy script in the repository |
| Why `REDUCED_MOTION_SPEED_FACTOR` is `1` (documented as "slows the wheels") | `UNKNOWN` | Value and prose disagree; see `12_KNOWN_GAPS_AND_RISKS.md` |
