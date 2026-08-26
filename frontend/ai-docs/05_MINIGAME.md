# DOC_ID: AI-05_MINIGAME
# SCOPE: The number-wheel minigame — full mechanics, loops, state machine, React integration
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/games/number-wheel/NumberWheelGame.tsx
# - src/games/number-wheel/gameEngine.ts
# - src/games/number-wheel/useNumberGame.ts
# - src/games/number-wheel/prizeCalculator.ts
# - src/games/number-wheel/config.ts
# - src/games/number-wheel/types.ts
# - src/games/number-wheel/number-wheel.css
# - src/games/number-wheel/components/NumberWheel.tsx
# - src/games/number-wheel/components/WheelGroup.tsx
# - src/pages/GameResult.tsx (host-side result screens)
# - src/games/registry.ts
# - src/config/appConfig.ts

## What The Minigame Is

Id `number-wheel`. Registry name `بازی اعداد`. The game shell renders the play screen
(«ماشین شانس» slot-game page, Figma frame 5); the host renders the result screens
(`src/pages/GameResult.tsx`, frames 6–8).

Three vertical digit reels (0–9) spin simultaneously. The player/presenter locks them one at a time,
left to right. The resulting 3-digit number is compared **positionally** against an editable target
number. Each digit that matches its target digit **in the same position** pays; nothing else pays.

This is the ONLY game in the working tree. It is a **DOM/CSS game** — there is no `<canvas>`, no SVG
rendering, no WebGL, and no game engine library. Motion is `transform: translate3d(...)` on a DOM node,
driven by `requestAnimationFrame`.

## Where It Lives

```
src/games/number-wheel/
├── NumberWheelGame.tsx     game shell: contract impl, input model, onComplete, play-screen layout
├── useNumberGame.ts        reducer wiring + action creators
├── gameEngine.ts           PURE state machine + digit/target helpers
├── prizeCalculator.ts      PURE scoring + prize formatting
├── config.ts               ALL tuning constants
├── types.ts                internal types
├── number-wheel.css        all play-screen styles + game-scoped :root tokens (rem-based)
└── components/
    ├── WheelGroup.tsx      lays out the three reels; computes the "active" reel
    └── NumberWheel.tsx     ONE reel: rAF spin loop + spring settle, direct DOM writes
```

The old `TargetDisplay.tsx`, `GameControls.tsx`, and `ResultDisplay.tsx` were **deleted** in the
page redesign — their responsibilities moved into `NumberWheelGame.tsx` (target editor + stop button)
and `src/pages/GameResult.tsx` (result screens, host-side).

## How It Is Mounted Into The React App

1. `src/games/registry.ts` statically imports `NumberWheelGame` and lists it in `GAME_DEFINITIONS`.
2. `src/config/appConfig.ts` sets `ACTIVE_GAME_ID = "number-wheel"`.
3. `src/pages/GamePage.tsx` calls `getActiveGame()`, takes `.Component`, and renders either the game
   (while playing) or the `GameResultScreen` (after `onComplete`):

```tsx
result ? (
  <GameResultScreen result={result} attemptsRemaining={...} saveStatus={...}
                    retryEnabled={canRetry} onRetrySave={...} onRetry={handleRetry}
                    onExit={session.startNewUser} onContinue={session.goToLeaderboard} />
) : (
  <GameComponent
    key={`${user.id}:${attempt}`}
    context={context}
    onComplete={handleComplete}
    onExit={session.startNewUser}
  />
)
```

4. `NumberWheelGame.tsx` imports `./number-wheel.css` — the stylesheet ships with the game module.
   `GamePage` wraps everything in the shared `PageShell` (`variant="survey"`) with the `GameHeader`
   logo, `FloatingDecorations`, and `StepTracker` — the game page shares the platform chrome.

The game receives exactly `GameProps` (`src/domain/game.ts`) and nothing else.

## Game Lifecycle

```
mount (fresh reducer state: random target, random start digits, phase IDLE)
  │
  ├─ IDLE ── target editable (tap digit → +1 mod 10 | «عدد تصادفی» → randomDigits())
  │          rules panel visible, «شروع» button visible
  │          action key or «شروع» tap ──► dispatch START
  │
  ├─ RUNNING ── all three reels spinning (rollingFlags → [T,T,T])
  │             the next reel to lock is highlighted; the button reads «توقف»
  │             action key #1 → lock reel 0 (stoppedCount 0→1) → rolling [F,T,T]
  │             action key #2 → lock reel 1 (stoppedCount 1→2) → rolling [F,F,T]
  │             action key #3 → lock reel 2 (stoppedCount 2→3) → phase RESULT
  │
  └─ RESULT ── all reels locked; the game unmounts its chrome (stop button hides)
               ref-guarded effect fires onComplete(...) EXACTLY ONCE
               no further transitions exist inside the game
                 ↓
        host (GamePage) persists, then shows GameResultScreen:
          win → frame 7 («برنده شدید!» + prize card + Confetti)
          loss + retries left → frame 6 («متأسفانه برنده نشدید» + «تلاش دوباره»)
          loss, no retries → frame 8 (game over, «خروج از بازی» only)
```

**Reset = unmount + remount.** There is no `RESET` action, no "play again" button inside the game,
and no way to return to `IDLE` from `RUNNING` or `RESULT`. Retry = `GamePage.handleRetry` → sets
`result` back to `null` + `session.retry()` → the `key` changes → a fresh game mounts.

## Game State Shape

Authoritative reducer state — `GameSnapshot` in `src/games/number-wheel/types.ts`:

```ts
type Digit  = number;                              // one decimal digit 0–9
type Digits = [Digit, Digit, Digit];               // [hundreds, tens, ones]
type GameState = "IDLE" | "RUNNING" | "RESULT";
type StoppedCount = 0 | 1 | 2 | 3;

interface GameSnapshot {
  phase: GameState;
  stoppedCount: StoppedCount;   // how many reels are locked, left to right
  target: Digits;               // what the player must match
  digits: Digits;               // locked digits; for a rolling reel this is only a fallback
}
```

Scoring output — `WheelPrizeResult`:

```ts
interface WheelPrizeResult {
  correctDigits: number;   // 0–3 exact positional matches
  prize: number;           // currency units
  perfect: boolean;        // correctDigits === 3
}
```

Initial state (`useNumberGame`): `createNewGame()` → `randomTargetNumber()` (0–999, `Math.random`) →
`numberToDigits` for `target`; `randomDigits()` for `digits`; then
`createInitialSnapshot(target, digits)` → `{ phase: "IDLE", stoppedCount: 0, target, digits }`.

Note: `createNewGame()` also returns `targetNumber`, which `useNumberGame` does not consume.

## Entity Model

There are no entities, no sprites, no world, no camera. The "world" is three independent reel
components plus one reducer snapshot. There is no collision detection and no physics simulation other
than the per-reel settle spring described below.

## Input Events

| Trigger | Source | Effect |
|---|---|---|
| Tap «شروع» / «توقف» | `NumberWheelGame` `.slot-game__stop` → `handlePrimaryPress` | IDLE → `start()`; RUNNING → `handleStop()` |
| `PageUp` | `window` `keydown` in `NumberWheelGame` | IDLE → `start()`; otherwise → `handleStop()` |
| `PageDown` | same | same |
| `b` / `B` (`event.key.toLowerCase() === "b"`) | same | same |
| `F5` | same | same, **and** `preventDefault()` |
| `Ctrl+R` / `Cmd+R` (`event.key.toLowerCase() === "r"` with `ctrlKey` or `metaKey`) | same | same, **and** `preventDefault()` |
| Tap a target digit | `NumberWheelGame` `button.slot-game__target-digit` | `handleDigitTap(index)` → `SET_TARGET` (IDLE only) |
| Tap «عدد تصادفی» | `NumberWheelGame` `.slot-game__random` | `handleRandomTarget()` → `SET_TARGET(randomDigits())` (IDLE only) |
| Tap «خروج» | `NumberWheelGame` `.slot-game__exit` | `onExit()` → host `startNewUser()` |

Input rules enforced in code:

- `event.repeat` is ignored → key auto-repeat cannot fire multiple stops.
- `MIN_STOP_INTERVAL_MS` (200 ms, measured with `performance.now()` against `lastStopAt`) debounces
  consecutive stops.
- Only refresh keys are `preventDefault()`-ed; `PageUp`/`PageDown`/`b` are not.
- **The on-screen button is the primary input**: it reads «شروع» at IDLE and «توقف» while RUNNING
  (a touchscreen-friendly 288×128 target). The presenter keyboard mirrors the same actions; the
  Space-badge next to the remote hint is decorative only — **no Space key handler exists**.
- The listener is attached to `window` and is scoped to the game's lifetime (added on mount, removed on
  unmount). While the game is mounted, these keys are captured app-wide.
- In `RESULT`, an action key calls `handleStop()`, which returns immediately because
  `state !== "RUNNING"`. Effectively a no-op.
- `handleStop` calls `navigator.vibrate(15)` (45 ms for the final reel) before dispatching `STOP`.

## Update Loop

There is no single global game loop. Each `NumberWheel` instance owns two mutually exclusive
`requestAnimationFrame` loops, selected by its `rolling` prop.

### Spin loop (`rolling === true`), `NumberWheel.tsx`

```
last = performance.now()
per frame:
  dt = min((now - last) / 1000, 0.05)      // clamp guards against tab stalls
  last = now
  positionRef.current = (positionRef.current + speed * dt) % 10
  writeTransform()
```

- `speed` is in **digits per second**.
- Position wraps modulo 10; because the strip holds 3 identical copies of 0–9, the wrap lands on visually
  identical content → seamless loop.
- Cleanup: `cancelAnimationFrame(raf)`.
- Effect deps `[rolling, speed]`; sets `wasRollingRef.current = true` on entry.

### Settle loop (`rolling === false`), `NumberWheel.tsx`

```
wasRolling = wasRollingRef.current; wasRollingRef.current = false
if (wasRolling) { setJustLocked(true); timer(LOCK_PULSE_MS) → setJustLocked(false) }

q        = positionRef.current
velocity = wasRolling ? speed : 0        // inherits spin momentum
target   = nearestTarget(q, digit)       // digit + 10 * round((q - digit) / 10)

per frame:
  dt = min((now - last)/1000, 0.05)
  error     = target - q
  velocity += (SPRING_STIFFNESS * error - SPRING_DAMPING * velocity) * dt
  q        += velocity * dt
  positionRef.current = q; writeTransform()
  if (|target - q| < SETTLE_EPSILON && |velocity| < SETTLE_MIN_VELOCITY) {
      positionRef.current = digit; writeTransform(); return   // snap + stop
  }
```

- Semi-implicit Euler integration of a damped spring. `SPRING_STIFFNESS = 170`, `SPRING_DAMPING = 20`
  (under-damped → a small overshoot/bounce before resting).
- `SETTLE_EPSILON = 0.004` item-heights, `SETTLE_MIN_VELOCITY = 0.06` item-heights/second (module-local
  constants in `NumberWheel.tsx`, not in `config.ts`).
- Terminates by returning without scheduling another frame; the final position is snapped exactly to
  `digit`.
- Cleanup: `cancelAnimationFrame(raf)` + `clearTimeout(pulseTimer)`.
- Effect deps `[rolling, digit, speed]`.

## Frame Timing Mechanism

`requestAnimationFrame` with `performance.now()` deltas, clamped to 50 ms per frame. No fixed timestep,
no accumulator, no `setInterval`. There is **no** `setTimeout`-based simulation; the only `setTimeout`
is the cosmetic lock-pulse timer.

Consequence: motion is time-based (frame-rate independent) but not deterministic across frame rates —
the exact resting digit depends on *when* the human pressed STOP, which is the intended mechanic.

## Render Pipeline

The play screen (`NumberWheelGame`) is one `.slot-game` column: exit pill, kicker «ماشین شانس»,
heading «عدد NNN را پیدا کنید» (target digits gold, tappable at IDLE), «عدد تصادفی» pill (IDLE only),
two status pills («فرصتهای بازی» cyan dots = attempts total/spent; «شلیک برای رقم N» green dots =
shots taken), the `.reel-machine` (labels رقم ۱/۲/۳ over `WheelGroup`), the big stop button, the
remote hint, and the glass rules panel (3 rules + 3 prize cards from config values).

Per reel, DOM structure produced by `NumberWheel`:

```
div.number-wheel[role=img][aria-label=…]           ← class modifiers drive all visual state
└── div.number-wheel__window
    ├── div.number-wheel__strip  (ref=stripRef)    ← 30 spans; transform written per frame
    │   └── span.number-wheel__digit × 30          ← STRIP_ITEMS: Persian ۰–۹ repeated 3×
    ├── div.number-wheel__fade--top                ← top/bottom gradient fades (2 per reel)
    └── div.number-wheel__fade--bottom
```

(The old `__next-badge` and `__center` band were removed in the redesign.)

Transform math (`writeTransform`):

```
STRIP_LENGTH = 10 * STRIP_REPEATS = 30
BASE_OFFSET  = 380 / 360 + 9 = 9.4444…   // centers item 10 (digit 0) at position 0
percent = (-(BASE_OFFSET + positionRef.current) * 100) / STRIP_LENGTH
strip.style.transform = `translate3d(0, ${percent}%, 0)`
```

- Each `.number-wheel__digit` is exactly `--digit-font` tall (11.25rem = 180 px) and the window is
  `--wheel-h` (23.75rem = 380 px), so the window shows ~2 digits around the centered one. The digit at
  the window center is the one `digitFromPosition` reports and STOP locks.
- `useLayoutEffect` writes the initial transform before first paint (prevents a visible jump).
- Class modifiers: `--rolling` (cyan-tinted border + `filter: blur(1.6px)` on the strip),
  `--active` (cyan border + `wheel-active-pulse` glow animation, only while rolling),
  `--locked` (cyan border at higher opacity), `--just-locked` (0.7 s `wheel-lock-pulse` scale bump).
- Blur is suppressed by `data-reduced-motion` on the strip (`[data-reduced-motion]` set to `true` or
  omitted, never `false`).

Which reel is "active" (`WheelGroup.tsx`): `state === "RUNNING" ? rolling.findIndex(Boolean) : -1` —
the leftmost still-rolling reel, i.e. the one the next STOP will lock.

Reel `locked` prop: `state !== "IDLE" && !rolling[index]`.

## React Integration

| Concern | Owner | Mechanism |
|---|---|---|
| Authoritative game phase | `useReducer(gameReducer)` in `useNumberGame` | React state |
| Which reels spin | derived, not stored | `rollingFlags({ phase, stoppedCount })` |
| Reel visual position | `positionRef` (mutable, **outside React**) | never triggers a render |
| Reel DOM transform | `stripRef.current.style.transform` | direct DOM write, once per frame |
| Digit captured on STOP | imperative read | `wheelRefs[i].current.getCurrentDigit()` via `useImperativeHandle` |
| Lock pulse | `useState` `justLocked` in `NumberWheel` | one render on lock, one when the pulse ends |
| Momentum carry-over | `wasRollingRef` | read-and-cleared inside the settle effect |
| STOP debounce | `lastStopAt` ref | `performance.now()` comparison |
| Once-only completion | `completedRef` in `NumberWheelGame` | effect on `state === "RESULT"` |
| Result screen | `GamePage` `useState` + `GameResultScreen` | host state; game knows nothing about it |

`NumberWheel` uses the **React 19 ref-as-prop form** — `ref?: Ref<NumberWheelHandle>` is declared in
`NumberWheelProps` and destructured like any other prop. There is no `forwardRef`.

`NumberWheelGame` creates the three refs by calling `useRef` three times inline into an array literal
(fixed hook order — safe, but do not make this array dynamic).

### Is game state mutable outside React state?

**Yes, deliberately.** `positionRef` (continuous reel position), `wasRollingRef`, `lastStopAt`, and
`completedRef` are mutable values React never sees. The reducer never learns the continuous position —
only the discrete digit sampled at the instant STOP fired. This is the core design of the game and must
be preserved.

### React-managed vs loop-managed

| React-managed | Loop-managed (refs + direct DOM) |
|---|---|
| `phase`, `stoppedCount`, `target`, `digits` | continuous strip position |
| which reels are rolling, which is active | per-frame transform |
| locked/active/just-locked CSS class selection | spring velocity during settle |
| target editor, stop button, status pills, rules panel | — |

### onComplete Contract

`NumberWheelGame` effect, deps `[state, target, digits, onComplete]`:

```tsx
if (state !== "RESULT" || completedRef.current) return;
completedRef.current = true;
onComplete({
  score: prize.prize,        // in this game score === prize amount
  winAmount: prize.prize,
  metadata: { target: digitsToNumber(target),
              finalNumber: digitsToNumber(digits),
              correctDigits: prize.correctDigits,
              perfect: prize.perfect },
});
```

`GamePage.handleComplete` additionally guards with `submittedRef`, so a double call cannot double-persist.

## Scoring / Win / Lose Conditions

`src/games/number-wheel/prizeCalculator.ts`:

```ts
countExactMatches(target, result) = target.reduce((n, d, i) => d === result[i] ? n+1 : n, 0)
```

| `correctDigits` | Constant | Value | `perfect` | Host result screen |
|---|---|---|---|---|
| 3 | `PRIZE_EXACT_3` | `5_000_000` | `true` | frame 7: «برنده شدید!», all 3 digits green, gold prize card, `Confetti` |
| 2 | `PRIZE_EXACT_2` | `1_000_000` | `false` | same win screen (win = `winAmount > 0`) |
| 1 | `PRIZE_EXACT_1` | `500_000` | `false` | same win screen |
| 0 | `PRIZE_EXACT_0` | `0` | `false` | frame 6 or 8: «متأسفانه برنده نشدید» (see below) |

- Position matters: a digit present elsewhere in the target counts for nothing.
- There is no timer, no lives, no fail state inside the game. Every round produces a result; "losing"
  is `correctDigits === 0`.
- Win/lose rendering is entirely host-side (`GameResultScreen`): `won = winAmount > 0`.
  - Loss with retries left (frame 6): message `هنوز ${attemptsRemaining} فرصت دیگر دارید!` +
    «تلاش دوباره» (primary) + «خروج از بازی».
  - Loss with no retries left (frame 8): «فرصتهای بازی شما به پایان رسید و در این بازی موفق به
    دریافت جایزه نشدید.» + «خروج از بازی» only.
  - The win prize card shows `formatPersianNumber(result.winAmount)` + «تومان» (config-driven, never
    hard-coded).
- The game uses `context.attemptsTotal` / `attemptsRemaining` for its status UI (rules line «در مجموع
  N فرصت», cyan attempts dots). `GamePage` supplies `attemptsTotal: MAX_GAME_ATTEMPTS` and
  `attemptsRemaining = Math.max(0, MAX_GAME_ATTEMPTS - attempt)`.
- `formatPersianNumber` renders digits in the display layer only; stored metadata stays Latin.

## Pause / Resume / Reset Behavior

- **No pause.** No pause action, no visibility-change handling. If the tab is backgrounded, `rAF` stops
  firing and the reels freeze mid-spin; the `dt` clamp prevents a large jump on resume.
- **No resume** semantics beyond that.
- **Reset**: unmount + remount only (`key={user.id}:{attempt}` in `GamePage`). All reducer state, refs,
  and the random target are regenerated.

## Game State Storage

- In-memory only, for the lifetime of the mounted component. Nothing about a round is persisted by the
  game.
- The host persists the *outcome* as a `GameSessionResult` through `GameResultRepository`
  (localStorage key `smartis-game.results.v1`). The `metadata` field carries `target`, `finalNumber`,
  `correctDigits`, `perfect`.

## Asset Loading And Usage

- No images, sprites, audio, or JSON assets. The reels render text.
- Fonts (registered in `src/styles/design-tokens.css`): `"IRANYekanXFaNum"` (`--ds-font-fanum`,
  static, for digits — the reels, target, stop button, amounts) and `"IRANYekanXVFaNum"`
  (`--ds-font-fanum-vf`, Persian text). `Vazirmatn` (`--ds-font-body`) is bundled and used for
  secondary text. No Orbitron face is present on disk; the Space badge uses the fallback stack.
- Digits inside the strip are Persian glyphs produced by `toPersianDigits` at build-of-array time
  (module scope).
- `favicon.svg` depicts three reels — decorative only.

## Randomness / Determinism

- `gameEngine.randomTargetNumber(exclude?, rng = Math.random)` and
  `randomDigits(rng = Math.random)` accept an injectable `rng`, making the engine deterministic when a
  seeded generator is supplied. **No caller currently passes one**, and the `exclude` parameter is never
  used.
- `createNewGame(rng = Math.random)` is called with no arguments by `useNumberGame`.
- `Confetti` uses `Math.random` directly (no injection point).
- Everything else is deterministic given `(target, digits)`; `gameReducer`, `rollingFlags`,
  `countExactMatches`, `calculatePrizeResult`, `numberToDigits`, `digitsToNumber`, `formatDigits`
  are pure.

## Important Constants And Tuning Values

`src/games/number-wheel/config.ts` — the ONLY place organizers should need to edit for this game:

| Constant | Value | Effect |
|---|---|---|
| `CURRENCY_SYMBOL` | `"تومان"` | Currency label on the rules prize cards |
| `PRIZE_EXACT_3` | `5_000_000` | Prize for 3 exact matches |
| `PRIZE_EXACT_2` | `1_000_000` | Prize for 2 |
| `PRIZE_EXACT_1` | `500_000` | Prize for 1 |
| `PRIZE_EXACT_0` | `0` | Prize for 0 |
| `WHEEL_SPEEDS` | `[8.5, 10, 11.5]` | Digits/second per reel, left→right |
| `SPRING_STIFFNESS` | `170` | Settle spring constant |
| `SPRING_DAMPING` | `20` | Settle damping (under-damped ⇒ bounce) |
| `LOCK_PULSE_MS` | `700` | Duration `justLocked` stays true |
| `MIN_STOP_INTERVAL_MS` | `200` | STOP debounce window |
| `REDUCED_MOTION_SPEED_FACTOR` | `1` | Multiplier applied to every speed when reduced motion is on. **`1` = no change** (see `12_KNOWN_GAPS_AND_RISKS.md`) |
| `STRIP_REPEATS` | `3` | Copies of 0–9 in each strip; drives `STRIP_LENGTH` |

Module-local constants NOT in `config.ts` (change these in `NumberWheel.tsx`):

| Constant | Value | Meaning |
|---|---|---|
| `STRIP_LENGTH` | `30` | `10 * STRIP_REPEATS` |
| `BASE_OFFSET` | `380 / 360 + 9` ≈ `9.4444` | Item-height offset centering digit 0 at position 0 (window 380 px, item 180 px) |
| `SETTLE_EPSILON` | `0.004` | Snap distance threshold (item heights) |
| `SETTLE_MIN_VELOCITY` | `0.06` | Snap velocity threshold (item heights/s) |

CSS tuning tokens declared in `src/games/number-wheel/number-wheel.css` `:root` (rem-based; 1 rem =
16 design px at the current `--s` scale):
`--wheel-w: 15.625rem` (250 px), `--wheel-h: 23.75rem` (380 px),
`--digit-font: 11.25rem` (180 px).

Haptic durations are inline literals in `NumberWheelGame.handleStop`: `45` ms for the final reel,
`15` ms otherwise.

Platform constants that affect the game: `MAX_GAME_ATTEMPTS = 3` and `ACTIVE_GAME_ID` in
`src/config/appConfig.ts`.

## Critical Invariants

1. `onComplete` fires **exactly once** per mounted game instance (`completedRef`), and `GamePage`
   independently guards with `submittedRef`.
2. STOP always locks the **leftmost still-rolling** reel: the reducer writes `digits[stoppedCount]`,
   then increments. `WheelGroup` highlights the same index via `rolling.findIndex(Boolean)`.
   These two must agree.
3. `stoppedCount === 3` ⟺ `phase === "RESULT"`. The reducer sets them together and rejects further STOPs.
4. `SET_TARGET` and `START` are honored only while `phase === "IDLE"`; `STOP` only while
   `phase === "RUNNING"` and `stoppedCount !== 3`. Invalid actions return the same state object.
5. Reel index 0 is the hundreds digit and is always the leftmost on screen. `.wheel-group`
   (CSS), `.reel-labels` and `.slot-game__target` (JSX `dir="ltr"`) guarantee this inside the RTL
   page; `.game-result__digits`, `.game-result__target-value`, and `.prize-card__value` do the same
   on the result screens.
6. The locked digit comes from the reel's live position (`getCurrentDigit()`), never from
   `snapshot.digits` — `digits` for a rolling reel is only a fallback.
7. `positionRef` stays within `[0, 10)` while rolling (modulo) and is snapped exactly to `digit` when a
   settle completes.
8. React must not re-render while a reel spins. Only `justLocked` may cause a reel render.
9. Every rAF loop and timer must be cancelled in its effect cleanup.
10. Prizes are paid for exact positional matches only — never for "closeness".
11. Persian digits appear only in rendered output; `target`/`digits`/`metadata` are Latin numbers.
12. The game imports nothing from `src/app/`, `src/pages/`, or `src/services/` — result screens live
    in the host (`GamePage`/`GameResult.tsx`), never inside the game module.
13. A win is `winAmount > 0` — a single exact match (500k) is a win and shows the frame-7 screen, not
    the loss screen.

## Known Fragile Areas

| Area | Risk |
|---|---|
| `wasRollingRef` read-and-clear inside the settle effect | Momentum inheritance and the lock pulse apply only to the **first** run of that effect after a rolling→stopped transition. Any change that causes the settle effect to re-run (e.g. adding a dep that changes on lock) silently drops the deceleration feel. |
| Spin effect deps `[rolling, speed]` | A `speed` change mid-spin tears down and rebuilds the loop. `speeds` is `useMemo`'d on `[reducedMotion]`, so this only happens if the OS setting flips mid-round. Adding an unstable dep here would restart the loop every render. |
| `window`-scoped `keydown` listener | Active for the whole game lifetime. `PageUp`/`PageDown`/`b` are not `preventDefault()`-ed, so they retain their default browser behavior. Any future focusable text surface inside the game would receive `b` as well as triggering a STOP. |
| Under-damped spring | `SPRING_STIFFNESS`/`SPRING_DAMPING` tuning changes can make the settle oscillate long enough that `SETTLE_MIN_VELOCITY` is never satisfied on slow frames. The loop has no iteration/time cap. |
| `dt` clamp of `0.05` | Long stalls (backgrounded tab) advance the reel far less than wall-clock time. Acceptable visually; it means position is not a function of elapsed real time. |
| `BASE_OFFSET = 380/360 + 9` coupled to `STRIP_REPEATS = 3`, `--digit-font` and `--wheel-h` | Changing `STRIP_REPEATS`, the digit height, or the window height without re-deriving `BASE_OFFSET` misaligns the centered digit. Any CSS resizing of the reels must keep the 380/360 ratio or update the constant. |
| `getCurrentDigit()` returning `?? 0` | If a reel ref were ever null at STOP time, digit `0` is silently locked instead of erroring. |
| `MIN_STOP_INTERVAL_MS = 200` vs presenter speed | A presenter pressing faster than 200 ms apart loses stops with no feedback. |
| Space badge on the remote hint | Decorative — no Space keydown handler exists. If a presenter presses Space it scrolls the page; do not assume Space stops the wheels. |
