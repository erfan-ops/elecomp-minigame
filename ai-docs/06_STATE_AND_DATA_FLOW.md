# DOC_ID: AI-06_STATE_AND_DATA_FLOW
# SCOPE: Every state container, its owner, shape, update path, persistence, and the data flows between them
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/app/AppSession.tsx
# - src/pages/RegistrationPage.tsx
# - src/pages/SurveyPage.tsx
# - src/pages/CategorySelectionPage.tsx
# - src/pages/GamePage.tsx
# - src/pages/LeaderboardPage.tsx
# - src/games/number-wheel/useNumberGame.ts
# - src/games/number-wheel/gameEngine.ts
# - src/games/number-wheel/NumberWheelGame.tsx
# - src/games/number-wheel/components/NumberWheel.tsx
# - src/services/localResultRepository.ts
# - src/services/leaderboard.ts
# - src/domain/*.ts

## State Categories Present

| Category | Present | Where |
|---|---|---|
| Global / session state | YES | `AppSessionProvider` React Context (`src/app/AppSession.tsx`) |
| UI state | YES | `useState` local to each page and to `NumberWheel` |
| Game state | YES | `useReducer` in `useNumberGame` + mutable refs in `NumberWheel` |
| Form state | YES | Local `useState` in `RegistrationPage` / `SurveyPage`; no form library, no real `<input>` |
| Persistent state | YES | `localStorage` key `smartis-game.results.v1` via `localResultRepository` |
| Server state | NO | Zero network calls in `src/` |
| Derived state | YES | `useMemo` (`context`, `speeds`, `result`, `confettiPieces`, context value) + pure functions (`rollingFlags`, `buildLeaderboard`, `calculatePrizeResult`, `canRetry`) |
| Temporary / transient state | YES | Refs: `pendingResultRef`, `savingRef`, `submittedRef`, `completedRef`, `lastStopAt`, `positionRef`, `wasRollingRef`, `stripRef`, `wheelRefs` |
| URL state | NO | No router, no `history`, no query params |
| Cache | NO | No memo cache, no query cache, no service worker |

## State Table

| State Name | Owner | Location | Shape | Update Method | Persistence | Notes |
|---|---|---|---|---|---|---|
| `phase` | `AppSessionProvider` | `src/app/AppSession.tsx` | `AppPhase = "REGISTRATION" \| "SURVEY" \| "CATEGORY" \| "GAME" \| "LEADERBOARD"` | Only via session actions (`register`, `completeSurvey`, `selectCategory`, `goToLeaderboard`, `startNewUser`) | none — resets on reload | The single navigation source of truth |
| `user` | `AppSessionProvider` | same | `User \| null` = `{ id: string; mobile: string } \| null` | `register(user)`; cleared by `startNewUser` | none | `mobile` is canonical `+989…`; `id` from `makeUserId()` |
| `category` | `AppSessionProvider` | same | `Category \| null` = `{ id: string; name: string } \| null` | `selectCategory(category)`; cleared by `register` / `startNewUser` | none | Value comes from `CATEGORIES` |
| `survey` | `AppSessionProvider` | same | `SurveyAnswers \| null` = `{ employeeCount: number; hasBenefits: boolean } \| null` | `completeSurvey(survey)`; cleared by `register` / `startNewUser` | none | Skip stores `{ employeeCount: 0, hasBenefits: false }` |
| `attempt` | `AppSessionProvider` | same | `number` (1-based) | `retry()` → `attempt + 1`; reset to `1` by `register` / `startNewUser` | none, but copied into each saved result | Part of the game remount `key` |
| `saveStatus` | `AppSessionProvider` | same | `SaveStatus = "idle" \| "saving" \| "saved" \| "error"` | `submitResult`, `retrySave`; reset to `"idle"` by `retry` / `register` / `startNewUser` | none | Drives `GamePage`'s status bar and `canRetry` |
| `savedResult` | `AppSessionProvider` | same | `GameSessionResult \| null` | Set on successful `submitResult` / `retrySave`; cleared by `retry` / `register` / `startNewUser` | none (the record itself is persisted separately) | `GamePage` reads `savedResult.winAmount` to decide retry eligibility |
| `pendingResultRef` | `AppSessionProvider` | same (`useRef`) | `GameSessionResult \| null` | Written by `submitResult`; read by `retrySave` | none | Retry-save payload; never rendered |
| `savingRef` | `AppSessionProvider` | same (`useRef`) | `boolean` | Set true at the start of a save, false in `finally` | none | Re-entrancy guard: a second concurrent save is dropped |
| `mobileDigits` | `RegistrationPage` | `src/pages/RegistrationPage.tsx` | `string` (Latin digits, max length 10) | `appendDigit`, `handleBackspace` (`slice(0, -1)`) | none | Displayed as Persian numerals by `PhoneDisplay` (page-1 redesign) |
| `error` | `RegistrationPage` | same | `string \| null` | Cleared on any digit edit; set to `MOBILE_ERROR` or `ALREADY_PLAYED_MESSAGE` | none | Rendered in `.registration-error` with `role="alert"` |
| `checking` | `RegistrationPage` | same | `boolean` | `true` before the anti-replay lookup, `false` in `finally` | none | Disables the keypad's «تایید» key while true |
| `topEntries` | `RegistrationPage` | same | `LeaderboardPanelEntry[]` = `{ mobile: string; amount: number }[]` | Set from `buildLeaderboard(getResults()).slice(0, 5)` (amount = `entry.winAmount`) in a mount effect; `[]` on failure | none | Fed to `LeaderboardPanel`; the panel shows an empty-state line when empty |
| `step` | `SurveyPage` | `src/pages/SurveyPage.tsx` | `1 \| 2` | ادامه advances 1→2; بازگشت returns 2→1 (step 1 بازگشت calls `startNewUser`) | none | The two local survey steps inside the single SURVEY phase (page-2 redesign) |
| `countChoice` | `SurveyPage` | same | `(typeof COUNT_OPTIONS)[number] \| null` | `chooseCount(option)`; cleared by the skip toggle | none | Mapped via `COUNT_TO_EMPLOYEES` → stored `employeeCount` (10/50/300/301) |
| `hasBenefits` | `SurveyPage` | same | `boolean \| null` | بله/خیر card tap on step 2 | none | `null` until answered; gates ادامه on step 2 |
| `notEmployed` | `SurveyPage` | same | `boolean` | Skip checkbox toggle | none | When true, dims the `ChoiceGrid` (`--disabled`), clears `countChoice`, and enables ادامه; continue stores `{ employeeCount: 0, hasBenefits: false }` |
| `selectedId` | `CategorySelectionPage` | `src/pages/CategorySelectionPage.tsx` | `string \| null` | Card tap | none | «ادامه» disabled while `null` |
| `submittedRef` | `GamePage` | `src/pages/GamePage.tsx` | `boolean` | Set true in `handleComplete`; reset to false in `handleRetry` | none | Second guard against double persistence |
| `context` (derived) | `GamePage` | same | `GameContext` | `useMemo(..., [user, category, attempt])` | none | `attemptsRemaining = Math.max(0, MAX_GAME_ATTEMPTS - attempt)` |
| `canRetry` (derived) | `GamePage` | same | `boolean` | Recomputed each render | none | `saveStatus === "saved" && (savedResult?.winAmount ?? 0) === 0 && attempt < MAX_GAME_ATTEMPTS` |
| `loadState` | `LeaderboardPage` | `src/pages/LeaderboardPage.tsx` | `LoadState = "loading" \| "loaded" \| "error"` | `load()` (in `useCallback`, invoked by `useEffect` and the retry button) | none | |
| `entries` | `LeaderboardPage` | same | `LeaderboardEntry[]` | Set from `buildLeaderboard(results)` | none (derived from persisted data) | Loaded once per mount |
| `GameSnapshot` | `useNumberGame` reducer | `src/games/number-wheel/useNumberGame.ts` | `{ phase: GameState; stoppedCount: StoppedCount; target: Digits; digits: Digits }` | `dispatch` of `START` / `STOP` / `SET_TARGET` through `gameReducer` | none | Authoritative game state; initialized lazily from `createNewGame()` |
| `wheelRefs[0..2]` | `NumberWheelGame` | `src/games/number-wheel/NumberWheelGame.tsx` | `RefObject<NumberWheelHandle \| null>` ×3 | Assigned by React on mount | none | Only use: `getCurrentDigit()` at STOP time |
| `lastStopAt` | `NumberWheelGame` | same | `number` (ms from `performance.now()`) | Written in `handleStop` | none | `MIN_STOP_INTERVAL_MS` debounce |
| `completedRef` | `NumberWheelGame` | same | `boolean` | Set true in the `RESULT` effect | none | Guarantees `onComplete` fires once per mount |
| `positionRef` | `NumberWheel` | `src/games/number-wheel/components/NumberWheel.tsx` | `number` — continuous strip position in item units, `[0, 10)` while rolling | Mutated every rAF frame by the spin and settle loops | none | **Outside React state by design.** Never triggers a render |
| `wasRollingRef` | `NumberWheel` | same | `boolean` | Set true when the spin effect starts; read-and-cleared at the top of the settle effect | none | Supplies settle momentum and gates the lock pulse |
| `stripRef` | `NumberWheel` | same | `HTMLDivElement \| null` | React ref assignment | none | Target of the only direct DOM write in the app |
| `justLocked` | `NumberWheel` | same | `boolean` | `setJustLocked(true)` on lock, `false` after `LOCK_PULSE_MS` | none | The ONLY React state a reel owns |
| Stored results | `localResultRepository` | `localStorage["smartis-game.results.v1"]` | `GameSessionResult[]` serialized as JSON | `save(result)` appends then `setItem`; read via `getResults()` | **PERSISTENT** across reloads and sessions | Survives until browser storage is cleared. Never pruned by the app |

## Exact TypeScript Types Referenced

`src/domain/user.ts`
```ts
interface User { id: string; mobile: string }        // mobile is canonical, e.g. "+989121234567"
```

`src/domain/category.ts`
```ts
interface Category { id: string; name: string }
```

`src/domain/survey.ts`
```ts
interface SurveyAnswers { employeeCount: number; hasBenefits: boolean }
```

`src/domain/game.ts`
```ts
interface GameContext { userId: string; mobile: string; sector: Category; attemptsRemaining?: number }
interface GameResult  { score: number; winAmount: number; metadata?: Record<string, unknown> }
interface GameProps   { context: GameContext; onComplete: (result: GameResult) => void; onExit: () => void }
```

`src/domain/gameResult.ts`
```ts
interface GameSessionResult {
  userId: string;
  mobile: string;            // canonical, unmasked
  employeeCount: number;     // 0 when the survey was skipped
  hasBenefits: boolean;
  attempt: number;           // 1-based
  sectorId: string;
  sectorName: string;
  gameId: string;
  score: number;
  winAmount: number;
  playedAt: string;          // ISO 8601
  metadata?: Record<string, unknown>;
}
interface LeaderboardEntry { rank: number; userId: string; mobile: string; score: number; winAmount: number }
```

`src/app/AppSession.tsx`
```ts
type AppPhase   = "REGISTRATION" | "SURVEY" | "CATEGORY" | "GAME" | "LEADERBOARD";
type SaveStatus = "idle" | "saving" | "saved" | "error";
// SessionState and AppSessionValue are declared but NOT exported.
```

`src/games/number-wheel/types.ts`
```ts
type Digit = number;
type Digits = [Digit, Digit, Digit];
type GameState = "IDLE" | "RUNNING" | "RESULT";
type StoppedCount = 0 | 1 | 2 | 3;
interface GameSnapshot { phase: GameState; stoppedCount: StoppedCount; target: Digits; digits: Digits }
interface WheelPrizeResult { correctDigits: number; prize: number; perfect: boolean }
```

## How State Updates Propagate

Two mechanisms only:

1. **React state / reducer** → re-render of the owning component and its subtree.
   Session state additionally re-renders every consumer of `useAppSession()`.
2. **Mutable refs + direct DOM writes** → no re-render at all. Used exclusively for per-frame reel
   animation, debounce timestamps, and once-only guards.

There is **no** event emitter, **no** pub/sub, **no** custom `window` event, **no** `BroadcastChannel`,
and **no** `storage` event listener. Two kiosk tabs would not see each other's writes until reload.

## Event-Driven Updates

| Event | Listener | Effect |
|---|---|---|
| `keydown` on `window` | `NumberWheelGame` (mount → unmount) | `PageUp`/`PageDown`/`b`/`F5`/`Ctrl+R`/`Cmd+R` → `start()` while `IDLE`, else `handleStop()`. Refresh keys `preventDefault()`-ed. `event.repeat` ignored |
| `change` on `matchMedia("(prefers-reduced-motion: reduce)")` | `usePrefersReducedMotion` | Updates the boolean; recomputes reel `speeds`, suppresses confetti and blur |
| `contextmenu` on `div.app` | `AppContent` | `preventDefault()` app-wide |
| `requestAnimationFrame` | `NumberWheel` spin + settle loops | Mutates `positionRef` and writes `style.transform` |
| `setTimeout(LOCK_PULSE_MS)` | `NumberWheel` | Clears `justLocked` |
| `click` on buttons | Local handlers | Only path by which UI state and session state change |

## Persistence Layer

Interface (`src/services/resultRepository.ts`):
```ts
interface GameResultRepository {
  save(result: GameSessionResult): Promise<void>;
  getResults(): Promise<GameSessionResult[]>;
}
```

Active implementation selected in `src/services/index.ts`:
```ts
export const resultRepository: GameResultRepository = localResultRepository;
```

`src/services/localResultRepository.ts` behavior:

| Aspect | Fact |
|---|---|
| Storage key | `"smartis-game.results.v1"` |
| Format | JSON array of `GameSessionResult` |
| `loadAll()` | `try/catch` → `[]` on any throw or non-array payload; then `.filter(isGameSessionResult)` |
| `isGameSessionResult` | Validates 11 fields by `typeof` (`metadata` is not validated) |
| `save()` | `loadAll()` → `push` → `setItem`. **No `try/catch`** — a throw rejects the promise, surfacing as `saveStatus: "error"` |
| `getResults()` | Returns `loadAll()` |
| Pruning / migration | NONE. Records accumulate indefinitely; the `.v1` suffix is the only versioning affordance |
| Corrupt data | Silently dropped, no logging |

What is persisted: only `GameSessionResult` records. **Not persisted:** current phase, current user,
survey answers of an in-progress session, attempt counter, or any game-internal state. A reload during a
session sends the kiosk back to `REGISTRATION` with all in-progress data lost.

## Derived State

| Derived value | Source | Function |
|---|---|---|
| Which reels roll | `phase`, `stoppedCount` | `rollingFlags()` — `[running && sc<=0, running && sc<=1, running && sc<=2]` |
| Active (next-to-stop) reel index | `rolling[]`, `state` | `WheelGroup`: `state === "RUNNING" ? rolling.findIndex(Boolean) : -1` |
| Reel `locked` prop | `state`, `rolling[i]` | `state !== "IDLE" && !rolling[index]` |
| Prize result | `target`, `digits` | `calculatePrizeResult()` → `{ correctDigits, prize, perfect }`, `useMemo` on `RESULT` |
| Reel speeds | `WHEEL_SPEEDS`, `reducedMotion` | `useMemo(..., [reducedMotion])` |
| `GameContext` | `user`, `category`, `attempt` | `useMemo` in `GamePage` |
| `canRetry` | `saveStatus`, `savedResult.winAmount`, `attempt` | Inline expression in `GamePage` |
| Leaderboard entries | stored results | `buildLeaderboard()` |
| Displayed mobile (input) | `mobileDigits` | `PhoneDisplay` → Persian numerals (page-1 redesign) |
| Displayed mobile (public) | canonical mobile | `formatMaskedMobile()` → `912 *** 4567` |
| Persian numerals | any number/string | `toPersianDigits()`, `formatPersianNumber()` |
| Route component | `phase` | `APP_ROUTES.find(e => e.id === phase) ?? APP_ROUTES[0]` |
| Active game | `ACTIVE_GAME_ID` | `getActiveGame()` |

`buildLeaderboard` (`src/services/leaderboard.ts`) is pure and total:
1. Reduce to best-score-per-`userId` via a `Map` (`result.score > existing.score` — first record wins ties).
2. Sort: `score` descending → earlier `playedAt` → `userId` lexicographic.
3. Map to `{ rank: index + 1, userId, mobile, score }` (dense sequential ranks; tied scores get distinct ranks).

## Flow: Registration → Persisted Result

```
Keypad.onDigit
  └─► RegistrationPage.appendDigit → mobileDigits (≤10)
        └─► «تایید» → isValidMobileDigits(/^9\d{9}$/)?
              ├─ no  → error = MOBILE_ERROR                          [stop]
              └─ yes → canonical = toCanonicalMobile(digits)
                       await resultRepository.getResults()
                         ├─ throws → FAIL OPEN, continue
                         └─ contains result.mobile === canonical
                              → error = ALREADY_PLAYED_MESSAGE       [stop]
                       session.register({ id: makeUserId(), mobile: canonical })
                         └─► phase SURVEY   (user set; category/survey/attempt/saveStatus/savedResult reset)

SurveyPage (two local steps inside SURVEY):
  step 1: ChoiceGrid range card → countChoice ──┤
         skip checkbox → notEmployed            │ ادامه enabled when countChoice or notEmployed
  step 2: بله/خیر card → hasBenefits ───────────┤
  ادامه → completeSurvey(
    notEmployed ? { employeeCount: 0, hasBenefits: false }
                : { employeeCount: COUNT_TO_EMPLOYEES[countChoice], hasBenefits }
  )  ─► phase CATEGORY
  بازگشت → step 2: back to step 1 | step 1: startNewUser()  ─► phase REGISTRATION (full reset)
CategorySelectionPage → selectCategory(category)             ─► phase GAME

GamePage mounts <NumberWheelGame key={user.id}:{attempt} context onComplete onExit>
  └─► game plays (see 05_MINIGAME.md) → onComplete(GameResult)
        └─► GamePage.handleComplete  (submittedRef guard)
              GameSessionResult = {
                userId: user.id, mobile: user.mobile,
                employeeCount: survey.employeeCount, hasBenefits: survey.hasBenefits,
                attempt, sectorId: category.id, sectorName: category.name,
                gameId: game.id, score, winAmount,
                playedAt: new Date().toISOString(), metadata }
              └─► session.submitResult(record)
                    savingRef guard → saveStatus "saving"
                    pendingResultRef = record
                    await resultRepository.save(record)
                      ├─ ok    → saveStatus "saved",  savedResult = record
                      └─ throw → saveStatus "error"   (error object discarded)
                    finally savingRef = false
```

## Flow: After A Result

```
saveStatus "error"  → «تلاش مجدد» → session.retrySave() → re-save pendingResultRef
saveStatus "saved"
  ├─ canRetry (winAmount === 0 && attempt < MAX_GAME_ATTEMPTS)
  │     → «تلاش دوباره» → GamePage.handleRetry(): submittedRef = false; session.retry()
  │        → attempt+1, saveStatus "idle", savedResult null
  │        → new key ⇒ game unmounts + remounts with a fresh target
  └─ «ادامه» → session.goToLeaderboard() → phase LEADERBOARD

LeaderboardPage mount → resultRepository.getResults() → buildLeaderboard → entries
  └─ «کاربر جدید» → session.startNewUser() → phase REGISTRATION, full reset
```

## State Update Rules (MUST follow)

1. `phase` MUST only change through a session action in `src/app/AppSession.tsx`. Pages MUST NOT hold
   their own navigation state.
2. New session state fields MUST be added to `SessionState`, to every reset path (`register`,
   `startNewUser`), and to the `useMemo` dependency array of the context value — otherwise consumers see
   stale values.
3. Pages MUST read shared facts (`user`, `category`, `survey`, `attempt`) from `useAppSession()`, never
   duplicate them into local state.
4. Persistence MUST go through `resultRepository`. No component may call `localStorage` directly.
5. Games MUST NOT read or write session state or the repository. They receive `GameContext` and emit
   `GameResult`.
6. `onComplete` MUST fire exactly once per mounted game instance.
7. Per-frame values MUST live in refs and be written straight to the DOM. Introducing React state that
   changes every frame is a regression.
8. Adding a field to `GameSessionResult` REQUIRES updating `isGameSessionResult` in
   `localResultRepository.ts`, or every stored record will be filtered out as invalid on read.
9. Latin digits and ISO timestamps in state and storage; Persian numerals only at render time.
10. `mobile` MUST be stored canonical and unmasked; masking is a display concern
    (`formatMaskedMobile`).
