# DOC_ID: AI-04_REACT_APPLICATION
# SCOPE: React entry, root, pages, components, hooks, context, render behavior, error/loading handling
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/main.tsx
# - src/app/App.tsx
# - src/app/AppSession.tsx
# - src/app/routes.tsx
# - src/pages/*.tsx
# - src/components/*.tsx
# - src/hooks/usePrefersReducedMotion.ts

## App Entry Point

`src/main.tsx`

```tsx
const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");
createRoot(root).render(<StrictMode><App /></StrictMode>);
```

- React 19 `createRoot` API.
- `StrictMode` is ON → double-invoked effects in development. All effects in this repo are
  cleanup-correct and idempotent-safe under double mounting (rAF cancelled, listeners removed, timers
  cleared, `completedRef` / `submittedRef` guards).
- Global CSS is imported here (`./styles/global.css` then `./styles/app.css`).

## Root Component

`src/app/App.tsx` — default export `App`.

- `App` renders `AppSessionProvider` wrapping `AppContent`. It has no props and no state.
- `AppContent` reads `phase` via `useAppSession()`, resolves the route, and renders:
  `<div className="app" onContextMenu={e => e.preventDefault()}><Page /></div>`.
- Suppressing the context menu here covers the entire app (long-press menus on touchscreens).

## Router Setup

None. See `03_ARCHITECTURE.md` → "Routing Flow". The route table is
`APP_ROUTES: readonly AppRoute[]` in `src/app/routes.tsx`:

```ts
interface AppRoute { id: AppPhase; label: string; component: ComponentType }
```

`label` values: `ثبت‌نام`, `نظرسنجی`, `انتخاب دسته‌بندی`, `بازی`. Currently unread.

## Layout Structure

There is no layout component. Layout is CSS-driven:

- `.app` — `height: 100%`, `overflow: hidden`, radial-gradient background.
- All pages render inside `PageShell` (`src/components/ui/PageShell.tsx`) — the only page frame. The
  legacy `.page` / `.page__title` / `.page__actions` primitives and the `.btn` button family were
  deleted together with the last legacy page (the leaderboard page, removed 2026-08-26).

## Context Provider

`AppSessionProvider` (`src/app/AppSession.tsx`) — the only Context in the repository.

- Context object: `AppSessionContext = createContext<AppSessionValue | null>(null)`.
- Consumer hook: `useAppSession(): AppSessionValue`. Throws
  `Error("useAppSession must be used inside AppSessionProvider")` when used outside the provider.
- Value is `useMemo`'d over all 7 state fields plus the 7 `useCallback`-stable actions. Because every
  action is stable, the memo effectively re-computes only when session state changes.
- Exported types: `AppPhase`, `SaveStatus`.

`AppSessionValue` surface:

| Member | Type | Meaning |
|---|---|---|
| `phase` | `AppPhase` | Current screen |
| `user` | `User \| null` | `{ id, mobile }` |
| `category` | `Category \| null` | Chosen sector |
| `survey` | `SurveyAnswers \| null` | `{ employeeCount, hasBenefits }` |
| `attempt` | `number` | 1-based attempt of the game being played |
| `saveStatus` | `"idle" \| "saving" \| "saved" \| "error"` | Persistence state of the current result |
| `savedResult` | `GameSessionResult \| null` | Last successfully persisted record |
| `register` | `(user: User) => void` | → `SURVEY`, resets everything else |
| `completeSurvey` | `(survey: SurveyAnswers) => void` | → `CATEGORY` |
| `selectCategory` | `(category: Category) => void` | → `GAME` |
| `goBackToSurvey` | `() => void` | → `SURVEY` — the category page's «بازگشت» (previous step; user kept, `category`/`survey` cleared) |
| `submitResult` | `(result: GameSessionResult) => Promise<void>` | Persist; sets `saveStatus` |
| `retrySave` | `() => Promise<void>` | Re-persist `pendingResultRef` |
| `retry` | `() => void` | `attempt + 1`, `saveStatus: "idle"`, `savedResult: null` |
| `startNewUser` | `() => void` | → `REGISTRATION`, full reset — also the result screens' «ادامه» / «خروج از بازی» path (registration embeds the leaderboard panel, so there is no separate leaderboard phase) |

## Pages

| Component | Path | Responsibility | Props | State Used | Side Effects | Notes |
|---|---|---|---|---|---|---|
| `RegistrationPage` | `src/pages/RegistrationPage.tsx` | Collect mobile; validate; anti-replay check; `register` | none | local `mobileDigits`, `error`, `checking`, `topEntries`; session `register` | `resultRepository.getResults()` twice: once on mount for the leaderboard panel's top 5, once per submit for anti-replay | Digit cap 10 hard-coded in `appendDigit`; validation via `isValidMobileDigits`. **Redesigned page 1**: container logic unchanged, presentation composed from `src/components/ui/` components inside `PageShell` — since 2026-08-26 the **same shell + `GameHeader` + `FloatingDecorations` as pages 2+** (no more `Container.svg` logo) |
| `SurveyPage` | `src/pages/SurveyPage.tsx` | Collect `employeeCount` + `hasBenefits`, or skip | none | local `step` (1 \| 2), `countChoice`, `hasBenefits`, `notEmployed`; session `completeSurvey`, `startNewUser` | none | **Redesigned page 2**: two local steps inside the single SURVEY phase — step 1 = four count-range cards (`COUNT_OPTIONS` → `COUNT_TO_EMPLOYEES` {10,50,300,301}), step 2 = بله/خیر. Skip checkbox stores `{0, false}`. بازگشت: step 2 → step 1; step 1 → `startNewUser()`. ادامه disabled until the step is answerable |
| `CategorySelectionPage` | `src/pages/CategorySelectionPage.tsx` | Pick one sector from `CATEGORIES` | none | local `selectedId`; session `selectCategory`, `goBackToSurvey` | none | **Redesigned page 4**: `PageShell variant="survey"` + `GameHeader` + `FloatingDecorations` + `StepTracker` (index 3); glass cards (emoji + name + sponsor logos from `public/stores/`); شروع بازی disabled until a card is selected; بازگشت = `goBackToSurvey()` (back to the survey — the previous step; the user stays registered; the survey restarts at step 1) |
| `GamePage` | `src/pages/GamePage.tsx` | Host the active game; adapt + persist; retry/continue chrome | none | session `user`, `category`, `survey`, `attempt`, `saveStatus`, `savedResult`, `submitResult`, `retrySave`, `retry`, `startNewUser`; local `result` (`GameResult \| null`); ref `submittedRef` | `new Date().toISOString()`; `session.submitResult` → repository | Returns `null` if `user`/`category`/`survey` is missing (defensive). After `onComplete` renders `GameResultScreen` (frames 6–8) instead of the game; retry = `setResult(null)` + `session.retry()` (remount via `key`). `onExit` and `onContinue` both wire to `startNewUser`. Wrapped in `PageShell variant="survey"` with `GameHeader` + `FloatingDecorations` + `StepTracker` (index 4) |

All four pages take **no props** — they read everything from `useAppSession()`.

## Shared Components

| Component | Path | Responsibility | Props | State Used | Side Effects | Notes |
|---|---|---|---|---|---|---|
| `VirtualNumericKeyboard` | `src/components/VirtualNumericKeyboard.tsx` | 3×4 on-screen numeric pad | `onDigit(digit: string)`, `onBackspace()`, `onConfirm()` | none (stateless) | none | Keys `1..9`, `⌫`, `0`, `✓`. `role="group"`, `aria-label="صفحه‌کلید عددی"`. Grid is `direction: ltr`. **Retained but currently unused** — the redesigned registration uses `ui/Keypad` and the redesigned survey uses `ui/ChoiceGrid` (no typed input remains) |
| `Confetti` | `src/components/Confetti.tsx` | CSS-only celebration overlay | `count?: number` (default `64`) | none | none | Randomized piece styles computed in `useMemo(…, [count])`; sets CSS vars `--drift`, `--spin`; `aria-hidden` |
| `PageShell` | `src/components/ui/PageShell.tsx` | Redesigned page frame: dark canvas, glow blobs, logo, scaled content frame | `children` | none | none | See `design-system.md` |
| `StepTracker` | `src/components/ui/StepTracker.tsx` | RTL journey tracker (circles + labels + connectors) | `steps: readonly string[]`, `currentIndex: number` | none | none | Steps `<= currentIndex` get the primary gradient treatment |
| `GradientText` | `src/components/ui/GradientText.tsx` | Gradient-clipped text | `gradient?`, `className?`, `children` | none | none | Passes the gradient as a per-instance CSS var `--ds-text-gradient` |
| `LiveBadge` | `src/components/ui/LiveBadge.tsx` | «زنده» pill | none | none | none | Static decoration |
| `PhoneDisplay` | `src/components/ui/PhoneDisplay.tsx` | 468×96 glass mobile display, Persian digits | `value: string`, `placeholder?` | none | none | `role="textbox"`, no real `<input>` |
| `Keypad` | `src/components/ui/Keypad.tsx` | Redesigned 3×4 keypad (LTR, Persian labels, gradient confirm) | `onDigit`, `onBackspace`, `onConfirm`, `confirmDisabled?` | none | none | Order ۱ ۲ ۳ / ۴ ۵ ۶ / ۷ ۸ ۹ / تایید ۰ ⌫ |
| `LeaderboardPanel` | `src/components/ui/LeaderboardPanel.tsx` | «برترینهای امروز» panel (top 5, gold first row) | `entries: { mobile: string; amount: number }[]` | none | none | Binds to real data passed by the page (`amount` = stored `winAmount`); empty-state line when empty |
| `GameHeader` | `src/components/ui/GameHeader.tsx` | Page-2 header: star badge + LUCKY REELS wordmark + tagline | none | none | none | Orbitron stack → Bahnschrift fallback |
| `FloatingDecorations` | `src/components/ui/FloatingDecorations.tsx` | Page-2 atmospheric emoji layer | none | none | none | 8 emoji at design-px positions, `aria-hidden`, `pointer-events: none` |
| `ChoiceGrid` | `src/components/ui/ChoiceGrid.tsx` | 2×2 glass answer cards | `options`, `selected`, `onSelect`, `disabled?` | none (controlled) | none | Generic over the option type; `aria-pressed` per card; `disabled` for the skip state |
| `NavButtons` | `src/components/ui/NavButtons.tsx` | بازگشت / ادامه navigation pair | `onBack`, `onContinue`, `continueDisabled?`, `backLabel?`, `continueLabel?` | none | none | ادامه disabled at 35% opacity |

## Game Components

Documented in `05_MINIGAME.md` and `07_COMPONENTS_AND_MODULES.md`:
`NumberWheelGame`, `WheelGroup`, `NumberWheel`. (The old `TargetDisplay`/`GameControls`/
`ResultDisplay` were deleted in the page redesign; their roles moved into `NumberWheelGame`
and the host-side `GameResultScreen` in `src/pages/GameResult.tsx`.)

## Hooks

| Hook | Path | Returns | Behavior |
|---|---|---|---|
| `useAppSession` | `src/app/AppSession.tsx` | `AppSessionValue` | Throws outside the provider |
| `usePrefersReducedMotion` | `src/hooks/usePrefersReducedMotion.ts` | `boolean` | Lazy `useState` initializer reads `window.matchMedia("(prefers-reduced-motion: reduce)").matches`; `useEffect` subscribes to `change` and unsubscribes on cleanup. **Browser-only** — calls `window.matchMedia` during render initialization, so it would throw under SSR. No SSR exists here. |
| `useNumberGame` | `src/games/number-wheel/useNumberGame.ts` | `{ state, stoppedCount, target, digits, start, stop, setTarget }` | Wraps `useReducer(gameReducer, undefined, init)`; also re-exports `usePrefersReducedMotion` |

No custom hooks exist beyond these three.

## Re-Render-Sensitive Areas

| Area | Rule |
|---|---|
| `NumberWheel` while spinning | MUST NOT re-render per frame. Position lives in `positionRef`; the transform is written directly to `stripRef.current.style`. Adding React state that changes every frame here is a regression. |
| `NumberWheel` spin effect deps | `[rolling, speed]`. Changing `speed` mid-spin restarts the loop (resetting the frame clock but preserving `positionRef`). Do not add unstable values to these deps. |
| `NumberWheel` settle effect deps | `[rolling, digit, speed]`. It reads `wasRollingRef` and clears it, so an extra invocation with `rolling === false` skips the lock pulse and starts a zero-velocity settle. |
| `AppSessionProvider` memo | Dependency array lists all 7 state fields and all 7 callbacks. Adding a field to `SessionState` without adding it to the `useMemo` deps yields stale context. |
| `GamePage.context` | `useMemo(..., [user, category, attempt])`. `context` identity change does not remount the game (only `key` does), but it does re-render it. |
| `GamePage` game `key` | `` `${user.id}:${attempt}` `` — the intended remount trigger. Changing this expression changes reset semantics. |
| `NumberWheelGame` keydown effect | Re-subscribes whenever `state`, `start`, or `handleStop` identity changes (i.e. on most state transitions). This is intentional so the handler always sees current state. |
| `AppContent` | Re-renders on any session change; page subtrees are not memoized. Pages are small, so this is acceptable. |

`React.memo`, `useTransition`, `useDeferredValue`, and `useSyncExternalStore` are not used anywhere.

## Performance Considerations

- Per-frame work is confined to `NumberWheel`: a modulo add, one percentage computation, one
  `style.transform` write. Only `translate3d` is used (GPU-friendly); the strip has `will-change: transform`.
- `dt` is clamped to `0.05 s` in both loops, bounding the position jump after a tab-visibility stall.
- Spin blur is a CSS `filter: blur(1.6px)` on the strip, disabled via the `data-reduced-motion` attribute.
- `Confetti` renders `count` (default 64) absolutely-positioned spans, animated purely by CSS keyframes;
  it is mounted only on a perfect result and only when `reducedMotion` is false.
- `STRIP_ITEMS` (30 spans) is computed once at module scope, not per render.
- The registration leaderboard panel loads all results into memory and reduces to the top 5; dataset size is bounded by kiosk usage.

## Error Handling Patterns

| Site | Pattern |
|---|---|
| `src/main.tsx` | Throws on missing `#root`. No error boundary anywhere in the app. |
| `useAppSession` | Throws when used outside the provider. |
| `AppSession.submitResult` / `retrySave` | `try/catch` with a bare `catch { }` → `saveStatus: "error"`; `finally` releases `savingRef`. The error object is discarded (never logged). |
| `RegistrationPage.handleSubmit` | `try/catch`; on repository failure it **fails open** and registers the user anyway. `finally` clears `checking`. |
| `RegistrationPage` leaderboard-panel load | `try/catch` → `topEntries: []` (the panel degrades silently to its empty state; no retry UI). |
| `localResultRepository.loadAll` | `try/catch` → returns `[]`; corrupt/unavailable storage degrades silently. Entries failing `isGameSessionResult` are filtered out. |
| `localResultRepository.save` | **No try/catch** — a `QuotaExceededError` or blocked storage rejects the promise, which `submitResult` catches and surfaces as `saveStatus: "error"`. |
| Validation errors | Rendered as `role="alert"` text next to the offending control (`.registration-error` on page 1; the redesigned survey validates via the disabled ادامه state instead of error text). |

There is no logging framework, no `console.*` call, and no telemetry in `src/`.

## Loading States

- Registration leaderboard panel: loads once on mount; failures degrade silently to the empty state
  (`هنوز نتیجه‌ای ثبت نشده است.`). No visible loading/error states on the panel.
- `GameResultScreen`: `saveStatus` variants under the result views — `"saving"` shows
  `در حال ثبت نتیجه…`; `"error"` shows the error line + «تلاش مجدد»/«ادامه»; `"saved"` shows the
  view's actions (خروج / تلاش دوباره / ادامه).
- `RegistrationPage`: `checking` disables the «ورود» button during the anti-replay lookup (no spinner).

## Suspense / Lazy Loading

None. No `React.lazy`, no `<Suspense>`, no dynamic `import()`. The active game is statically imported by
`src/games/registry.ts`, so it is always in the main bundle.

## Client-Only / Browser-Only Logic

All of it. Specifically unguarded browser API access: `window.matchMedia` (in a `useState` initializer),
`localStorage`, `document.getElementById`, `performance.now`, `requestAnimationFrame`, `navigator.vibrate`,
`crypto.randomUUID`. There is no `typeof window === "undefined"` guard anywhere and none is needed for a
Vite SPA, but this code cannot be server-rendered as-is.

## Accessibility Patterns Present

- All interactive elements are real `<button type="button">`. There are no `div` click handlers on
  controls.
- `aria-pressed` on category cards, the survey choice cards, and the keypad; `role="checkbox"` +
  `aria-checked` on the skip checkbox; `aria-disabled` on the `ChoiceGrid` while skipped.
- `role="textbox"` + descriptive `aria-label` on the fake input surfaces.
- `role="alert"` on error text.
- `role="img"` + dynamic Persian `aria-label` on each reel (spinning / resting digit / "next").
- `role="group"` with labels on `.wheel-group`, `.target`, and the keyboard.
- `role="dialog" aria-modal="true"` on the result overlay.
- Decorative elements are `aria-hidden="true"` (caret, checkmarks, dots, strip, fades, confetti).
- Focus-visible outlines are defined in `src/styles/design-system.css` (the old `.btn:focus-visible`
  rule died with the leaderboard page).
