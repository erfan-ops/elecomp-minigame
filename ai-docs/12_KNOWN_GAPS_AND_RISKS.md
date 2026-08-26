# DOC_ID: AI-12_KNOWN_GAPS_AND_RISKS
# SCOPE: Verified inconsistencies, dead code, fragile areas, untested logic, technical debt, open questions
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - index.html
# - README.md
# - CLAUDE.md
# - src/** (every file)
# - src/styles/app.css
# - src/styles/global.css
# - src/games/number-wheel/number-wheel.css

Every item below was confirmed by reading the referenced file. Nothing here is speculation unless it is
labeled `INFERRED`, `UNVERIFIED`, or `UNKNOWN`.

## Documentation vs Code Inconsistencies (code wins)

| # | Inconsistency | Documented claim | Actual code | Severity |
|---|---|---|---|---|
| D1 | `GameContext` shape | `README.md:36-40` and `CLAUDE.md`'s contract block show `{ userId; firstName; lastName; mobile; sector }` | `src/domain/game.ts` declares `{ userId; mobile; sector; attemptsRemaining?; attemptsTotal? }` (the latter added in the page redesign). **No first/last name is collected anywhere** (`src/domain/user.ts` `User` is `{ id, mobile }`); both attempt fields are missing from the README (left untouched — human-owned files, user-approved scope excluded this pre-redesign gap) | HIGH — an agent following `README.md` would write a game against a non-existent contract |
| D2 | Reduced motion "slows the wheels" | `README.md:106-108` and `CLAUDE.md` state `prefers-reduced-motion` slows the wheels | `REDUCED_MOTION_SPEED_FACTOR = 1` in `src/games/number-wheel/config.ts`, and `NumberWheelGame.tsx` multiplies the (memoized) speeds by it — **reel speed is unchanged**. Blur suppression and confetti suppression DO work | MEDIUM — accessibility claim is not met |
| D3 | `index.html` `<title>` | — | `<title>بازی 10 ثانیه — Smartis</title>` names a game that does not exist in this working tree. The registry name is `بازی اعداد` (`GAME_TITLE` was removed from the game config in the page redesign) | MEDIUM — user-visible in the browser tab / kiosk window title |
| D4 | `global.css:87` comment | Comment says "runs at a gentler speed (see `REDUCED_MOTION_SPEED_FACTOR` in **gameConfig**)" | There is no `gameConfig` module. The constant lives in `src/games/number-wheel/config.ts`, and per D2 it does not slow anything | LOW |
| D5 | `app.css:213` comment | "…digit grouping); **name fields** stay RTL so Persian text reads naturally" | There are no name fields — registration collects only a mobile number | LOW |
| D6 | Numeric sequences must be LTR | `CLAUDE.md` states target/result values set `direction: ltr` | **RESOLVED** — the old `.result__value`/`.result__prize` (rtl) were deleted with the result overlay; the new result screens (`.game-result__digits`, `.game-result__target-value`, `.game-result__prize-amount`, `.prize-card__value`) set `direction: ltr` | — |
| D7 | `README.md` architecture tree | `README.md:113-124` lists `app/ pages/ components/ domain/ services/ games/ config/ utils/ styles/` | `src/hooks/` exists and is omitted from the tree | LOW |

`README.md` and `CLAUDE.md` both describe exactly one game (`number-wheel`), matching
`src/games/registry.ts`. The only stale single-game artifact is D3. See
`02_REPOSITORY_STRUCTURE.md` → "Working-Tree vs Git HEAD" for the tracked-but-absent
`src/games/ten-second/` directory, which no source file references.

## Missing Information Not Covered By README.md Or CLAUDE.md

| # | Gap |
|---|---|
| M1 | **Deployment target is `UNKNOWN`.** No CI config, host config, Dockerfile, or deploy script. How `dist/` reaches the kiosk is undocumented |
| M2 | **No data-retention or export story.** Results accumulate in `localStorage` forever, are never pruned, and there is no export/report mechanism — yet `README.md` mentions "future billing" and the survey answers are collected for analysis. How the organizer actually retrieves the data is undocumented |
| M3 | **Prize fulfilment is undocumented.** The app computes `winAmount` but has no redemption, voucher, or audit trail |
| M4 | **No stated browser/OS baseline** beyond "Chrome in kiosk mode". `crypto.randomUUID` requires a secure context (HTTPS or `localhost`) — over plain HTTP on a LAN IP it is `undefined` and the `Math.random` fallback silently takes over. Whether the kiosk is served over HTTPS is `UNKNOWN` |
| M5 | **Multi-kiosk operation is undefined.** `localStorage` is per-device, so several kiosks produce several disjoint leaderboards and the anti-replay check does not span devices. Whether that is acceptable is `UNKNOWN` |
| M6 | **`src/config/appConfig.ts` `CATEGORIES` has no stated source.** Whether the 8 sectors are fixed by the client or arbitrary is `UNKNOWN` |
| M7 | **Prize amounts have no stated authority.** Whether `5_000_000` / `1_000_000` / `500_000` تومان are final and who approves changes is `UNKNOWN` |
| M8 | **No accessibility target** (WCAG level or contrast requirement) is stated; contrast is `UNVERIFIED` |
| M9 | **`AppRoute.label` purpose.** Declared and documented as being for accessible announcements but never read. `INFERRED` reserved for future use |

## Unclear Or Undocumented Design Decisions

| # | Item | Question |
|---|---|---|
| Q1 | `score` === `winAmount` in the number-wheel game | `GameResult.score` is documented as a "generic ranking score" separate from the prize, yet the game sets both to the prize amount. The leaderboard therefore ranks by prize. Intentional or a shortcut? `UNKNOWN` |
| Q2 | Leaderboard header text | **RESOLVED** — `LeaderboardPage` and the page-1 `LeaderboardPanel` now render `entry.winAmount` (the stored prize), so the «جایزه» column no longer depends on Q1. `Q1` remains open: ranking still sorts by `score` |
| Q3 | Anti-replay fails open | `RegistrationPage.handleSubmit` registers the user when the repository throws. Documented as intentional in a code comment, but it means a storage failure disables the one-play-per-mobile rule entirely |
| Q4 | Retry only after a zero-win result | `canRetry` requires `winAmount === 0`. A 1-match win (500,000) ends the chain. Whether "any win ends the chain" is the intended business rule is stated in `CLAUDE.md` but not justified |
| Q5 | Best-score-per-user tie handling | `buildLeaderboard` keeps the FIRST record on an exact score tie (`>` not `>=`), so the earliest attempt wins. Deliberate? `INFERRED` yes (deterministic ordering is an explicit goal) |
| Q6 | Presenter keys include `F5` and `Ctrl+R` | Refresh keys are repurposed as STOP and `preventDefault`-ed. This makes deliberate reloading impossible from the presenter remote while the game is mounted. `INFERRED` intentional (kiosk safety) |
| Q7 | `b` as an action key | Unqualified single-letter key on `window`. Presumably a presenter remote's blank-screen button. `UNVERIFIED` |
| Q8 | `MIN_STOP_INTERVAL_MS = 200` | A presenter pressing faster than 200 ms loses stops **with no feedback**. Whether silent dropping or queueing is desired is `UNKNOWN` |

## Ambiguous Responsibilities

| # | Item |
|---|---|
| A1 | **`src/config/appConfig.ts` is source code but named/treated as config.** Editing it requires a rebuild. Organizers cannot tune it at runtime, which conflicts with the "organizer-tunable" framing in `README.md` |
| A2 | **Result messaging is computed in two places.** The game derives its status UI from `context.attemptsTotal`/`attemptsRemaining` (attempts dots, rules line «در مجموع N فرصت»); the host (`GamePage` → `GameResultScreen`) separately computes `attemptsRemaining`/`canRetry` for the retry message. Both derive from `MAX_GAME_ATTEMPTS` and `attempt`, so they agree today, but they are independent expressions (see R7) |
| A3 | **`useNumberGame.ts:46` re-exports `usePrefersReducedMotion`.** The hook's owner is `src/hooks/`; the re-export is dead (no importer uses it from here) and blurs where the hook comes from |
| A4 | **Reel geometry constants are split** between `config.ts` (`STRIP_REPEATS`, spring, speeds) and `NumberWheel.tsx` (`STRIP_LENGTH`, `BASE_OFFSET`, `SETTLE_EPSILON`, `SETTLE_MIN_VELOCITY`) even though they are mutually dependent |
| A5 | **Haptic durations (`45` / `15` ms) are inline literals** in `NumberWheelGame.handleStop`, not in `config.ts`, unlike every other tuning value |

## Fragile Game-Loop Code

All in `src/games/number-wheel/components/NumberWheel.tsx` unless noted. Change with care and re-verify
visually — nothing here is covered by an automated check.

| # | Area | Failure mode |
|---|---|---|
| R1 | `wasRollingRef` is read **and cleared** inside the settle effect body | Momentum inheritance and the lock pulse apply only to the FIRST run of that effect after a rolling→stopped transition. Adding any dependency that changes on lock silently removes the deceleration feel and the pulse |
| R2 | Spin effect deps `[rolling, speed]` | A `speed` identity change mid-spin tears down and rebuilds the loop. Safe today only because `speeds` is `useMemo`'d on `[reducedMotion]` |
| R3 | Settle loop has no iteration or time cap | Retuning `SPRING_STIFFNESS` / `SPRING_DAMPING` can produce oscillation that never satisfies both `SETTLE_EPSILON` and `SETTLE_MIN_VELOCITY`, leaving a rAF loop running indefinitely |
| R4 | `BASE_OFFSET = 380/360 + 9` is coupled to `STRIP_REPEATS = 3` and the rem token pair `--wheel-h` (23.75rem) / `--digit-font` (11.25rem) | Changing any one without re-deriving the others misaligns the centered digit in the reel window. Any CSS resizing of the reels must keep the 380/360 ratio or update the constant |
| R5 | `getCurrentDigit() ?? 0` in `NumberWheelGame.handleStop` | A null reel ref silently locks digit `0` instead of failing |
| R6 | `window`-scoped `keydown` listener in `NumberWheelGame.tsx` | Active for the whole game lifetime; `PageUp`/`PageDown`/`b` are NOT `preventDefault`-ed. Any future focusable text surface inside the game would receive `b` as text AND trigger a STOP |
| R7 | `attemptsRemaining` is computed by `GamePage` as `MAX_GAME_ATTEMPTS - attempt` and passed to `GameResultScreen` | If a future host forgets to pass it, a zero-win round would claim «هنوز ۰ فرصت دیگر دارید!» (game-over layout) even when retries remain |
| R8 | `dt` clamp of `0.05 s` in both loops | Reel position is not a function of elapsed wall-clock time after a tab stall. Acceptable visually; do not rely on position for timing |
| R9 | No `document.visibilitychange` handling | Backgrounding the kiosk browser freezes a spinning reel mid-round. On return it resumes from where it stopped. There is no pause UI and no recovery path |

## Performance-Sensitive Code

| # | Area | Constraint |
|---|---|---|
| P1 | `NumberWheel` spin/settle loops | MUST NOT trigger a React render per frame. Only `positionRef` + `style.transform`. Adding per-frame React state is a regression |
| P2 | `.number-wheel__strip` | `will-change: transform` plus `translate3d` keeps it on the compositor. Animating any other property here (e.g. `top`, `margin`) would force layout each frame |
| P3 | Spin blur `filter: blur(1.6px)` | A compositor-level filter on a continuously transforming element. Increasing the radius or adding more filters is a measurable cost on kiosk-class hardware. `UNVERIFIED` on the actual target device |
| P4 | `Confetti` with `count = 64` | 64 absolutely-positioned animated spans, mounted on a perfect result. Raising `count` materially raises paint cost during the celebration |
| P5 | `AppContent` re-renders the whole page subtree on any session change | Fine at current page sizes; no memoization exists to absorb growth |
| P6 | `LeaderboardPage` loads and reduces **all** stored results in memory | Unbounded growth: results are never pruned. At conference scale this is fine; over months on one device the array only grows. `UNVERIFIED` at what size it becomes noticeable |
| P7 | `localStorage` is synchronous | `save()` blocks the main thread. Negligible for small arrays; grows with P6 |

## Untested Critical Logic

There is **no test framework, no test file, and no test script**. Everything below is unverified by any
automated check. All of it is pure and trivially testable — this is the single largest quality gap in the
repository.

| # | Module | Why it matters |
|---|---|---|
| T1 | `gameReducer` (`gameEngine.ts:70`) | The entire game state machine, including the guards that prevent a 4th stop and a mid-round target edit |
| T2 | `rollingFlags` (`gameEngine.ts:103`) | Determines which reel a STOP locks. A wrong index would lock the wrong digit |
| T3 | `calculatePrizeResult` / `countExactMatches` (`prizeCalculator.ts`) | Decides real money |
| T4 | `buildLeaderboard` (`leaderboard.ts:13`) | Public ranking and tie-breaking |
| T5 | `isValidMobileDigits`, `toCanonicalMobile`, `formatMaskedMobile` (`user.ts`) | Identity, anti-replay key, and privacy masking |
| T6 | `isGameSessionResult` (`localResultRepository.ts:12`) | The only barrier between corrupt storage and the UI. A missed field silently discards every stored record |
| T7 | `numberToDigits` / `digitsToNumber` (`gameEngine.ts`) | Leading-zero handling and the 0–999 clamp |
| T8 | `toPersianDigits` / `formatPersianNumber` (`persian.ts`) | All numeric display, including the `٬` separator substitution |
| T9 | The anti-replay branch in `RegistrationPage.handleSubmit` | Business rule (one play per mobile) plus its fail-open path |
| T10 | `submitResult` / `retrySave` concurrency guard (`AppSession.tsx`) | Prevents double persistence |

Note: `randomTargetNumber`, `randomDigits`, and `createNewGame` all accept an injectable
`rng: () => number = Math.random`, so the whole engine is deterministically testable with zero mocking.

## Dead Code And Orphaned Definitions

| # | Item | Location | Status |
|---|---|---|---|
| X1 | `.btn--stop` and `@keyframes stop-attention` | `app.css` | **Deleted with the redesign** — the on-screen stop control is now `.slot-game__stop` (number-wheel.css) |
| X2 | `export { usePrefersReducedMotion }` | `useNumberGame.ts` | Dead re-export; no importer uses it from this path |
| X3 | `createNewGame().targetNumber` | `gameEngine.ts` | Returned but never read (`useNumberGame` uses only `target` and `startDigits`) |
| X4 | `randomTargetNumber(exclude?)` | `gameEngine.ts` | The `exclude` parameter is never passed a value — the only call site passes `undefined`. The retry `while` loop is unreachable |
| X5 | Commented-out `isMe` highlight | `LeaderboardPage.tsx` | Dead code kept in place |
| X6 | `.leaderboard-row--me td`, `.leaderboard__me` | `app.css` | Orphaned CSS for X5 |
| X7 | `.result__percent` | `number-wheel.css` | **Deleted with the result overlay in the redesign** — result UI now uses `.game-result__*` |
| X8 | `countExactMatches` export | `prizeCalculator.ts` | Exported but only consumed internally by `calculatePrizeResult` |
| X9 | `VirtualNumericKeyboard` is fully unused | — | Page 1 uses the redesigned `ui/Keypad` and page 2's count question became range cards (`ui/ChoiceGrid`) — no typed input remains. The component and its `.keyboard*` styles are retained as a reusable primitive |
| X10 | `formatPrize` | `prizeCalculator.ts` | Exported but unused since the redesign — the result screens format the prize via `formatPersianNumber` (`.game-result__prize-amount`, `.prize-card__value`) |
| X11 | `public/App.png` | `public/` | The 560KB design reference image is copied verbatim into `dist/` although the app never references it |

`noUnusedLocals` / `noUnusedParameters` do not catch any of these — unused *exports* and unused *CSS*
are invisible to the compiler.

## Technical Debt

| # | Item | Impact |
|---|---|---|
| B1 | **No tests at all** | See T1–T10. Every refactor of pure logic is unverified |
| B2 | **No linter, no formatter** | Style is maintained by imitation only; nothing prevents drift |
| B3 | **No error boundary** | Any render-time throw in a page or the game blanks the kiosk with no recovery path and no operator-visible message |
| B4 | **Bare `catch { }` blocks discard errors** | `AppSession.submitResult` / `retrySave` and `localResultRepository.loadAll` swallow the error object entirely. There is no `console.*` call, no logging, and no telemetry anywhere in `src/`, so a persistence failure at an event is diagnosable only from the result screen's save-status line (the error variant with «تلاش مجدد» / «ادامه») |
| B5 | **`localResultRepository.save` has no `try/catch`** | Deliberate (the rejection becomes `saveStatus: "error"`), but a `QuotaExceededError` is indistinguishable from any other failure and the record is lost unless the operator taps «تلاش مجدد» |
| B6 | **Session state is not persisted** | A reload or crash mid-session loses the user, survey, category, and attempt, and returns to `REGISTRATION` |
| B7 | **`localStorage` is the system of record** | No backup, no sync, no server. Clearing browser data destroys the event's entire dataset. The kiosk browser MUST NOT clear storage between sessions |
| B8 | **No storage pruning or schema migration** | The `.v1` key suffix is the only versioning affordance; there is no migration code |
| B9 | **`aria-modal="true"` on `.result` without focus management** | **RESOLVED** — the `.result` dialog overlay was deleted with the redesign; `GameResultScreen` is a plain `<section>` with no dialog semantics |
| B10 | **Legacy font has a single weight** | `BYekan+.ttf` is Regular (400) only; 600–800 weights in the legacy styles are browser-synthesized. The redesigned faces are covered by real weights (Vazirmatn 400–700 bundled, IRANYekanXFaNum statics 400–900 + a variable face) — the concern now applies only to the legacy leaderboard page. Rendering quality is `UNVERIFIED` on the target device |
| B11 | **No `base` configured in `vite.config.ts`** | Assets, including `/BYekan+.ttf`, are referenced from the root. Serving `dist/` from a sub-path silently 404s the font |
| B12 | **Registration validates Iranian mobiles only** (`^9\d{9}$`) | Correct for the intended audience; there is no path for any other number format |
| B13 | **`LeaderboardPage.load` sets state without an unmount guard** | Would warn/no-op if the page unmounted mid-load. Not reachable in the current flow (`INFERRED` acceptable) |

## Possible Inconsistencies Within The Code Itself

| # | Item |
|---|---|
| C1 | `attemptsRemaining` is optional in `GameContext` but load-bearing for result messaging (R7) |
| C2 | `GameResult.score` is documented as independent of the prize, yet the only game sets them equal, and the leaderboard column is labelled «جایزه» (Q1, Q2) |
| C3 | Tuning constants are split between a `config.ts` and module-local literals (A4, A5) |
| C4 | Two reduced-motion mechanisms coexist — a global CSS override in `global.css` and the `usePrefersReducedMotion` hook — and only the CSS one has a visible effect on reel speed (which is to say: none, per D2) |
| C5 | `direction: rtl` on `.result__value` / `.result__prize` versus `direction: ltr` everywhere else digits appear (D6) | **RESOLVED** — both classes were deleted with the redesign; every remaining digit surface sets `direction: ltr` |
| C6 | `data-reduced-motion` is the only state expressed as a data attribute; every other state uses a modifier class. It is set to `"true"` or omitted, never `"false"`, so `[data-reduced-motion="false"]` would never match |
| C7 | Mobile digit rendering differs by surface: the redesigned pages 1–4, the game page, and the result screens write **English digits** rendered with Persian glyphs by the bundled fonts (keypad, display, reels, target, prizes — per user directive), while the legacy leaderboard page still renders Latin digits too. `UNKNOWN` whether the leaderboard should adopt the same treatment |
| C8 | Two masking formats coexist: `formatMaskedMobile` (3-3-4, three stars — leaderboard page) and `formatPanelMobile` (09-form, four stars — page-1 panel). Both derive from the same canonical value |

## Areas Needing Human Clarification

Ranked by how much a wrong assumption would cost:

1. **The `GameContext` contract (D1).** Should `firstName`/`lastName` be reinstated, or is the README
   stale? This determines what a new game can rely on.
2. **Reduced motion (D2).** Should `REDUCED_MOTION_SPEED_FACTOR` be lowered so the accessibility claim
   holds, or should the claim be removed?
3. **`index.html` `<title>` (D3).** What should the kiosk window title be?
4. **Data retrieval (M2, B7).** How does the organizer get results off the device, and what happens if
   storage is cleared?
5. **Multi-kiosk operation (M5).** One device or several? This decides whether a backend repository
   implementation is required.
6. **Deployment (M1).** Where does `dist/` get served from, and over HTTPS or HTTP (M4)?
7. **`score` vs `winAmount` semantics (Q1, Q2, C2).**
8. **Retry rule (Q4)** and **stop-debounce behavior (Q8)**.
9. **Whether tests should be introduced (B1)** — the pure core is ready for them.

## Documents In This Package With Non-VERIFIED Status

| Document | Status | Reason |
|---|---|---|
| `09_BUILD_RUN_DEPLOY.md` | `PARTIAL` | Deployment target and CI/CD are `UNKNOWN` (M1). Everything else in it is verified |

All other documents in `ai-docs/` are `VERIFIED`. Individual `INFERRED` / `UNVERIFIED` / `UNKNOWN`
statements are labeled inline where they occur; the notable ones are the design-decision table in
`03_ARCHITECTURE.md`, the contrast note in `08_STYLING_AND_UI_CONVENTIONS.md`, and P3/P6/B10 above.
