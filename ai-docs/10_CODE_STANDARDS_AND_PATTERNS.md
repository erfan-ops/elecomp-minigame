# DOC_ID: AI-10_CODE_STANDARDS_AND_PATTERNS
# SCOPE: Language flavor, TS strictness, import/export style, naming, component/hook patterns, error/async patterns, comments, repeated patterns, avoided patterns
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - tsconfig.app.json
# - tsconfig.node.json
# - package.json
# - src/** (every file)

Each rule below is labeled with how it is enforced:

| Label | Meaning |
|---|---|
| `ENFORCED` | A compiler/config setting fails the build if violated |
| `CONVENTION` | Consistent across the codebase but not machine-checked |
| `INFERRED` | A pattern observed in code; intent not stated anywhere |

## Language Flavor

| Aspect | Value | Enforcement |
|---|---|---|
| Language | TypeScript only. There is no `.js`/`.jsx` file in `src/` | `CONVENTION` |
| Module system | ESM (`"type": "module"`) | `ENFORCED` |
| JSX | `react-jsx` automatic runtime — no `import React from "react"` anywhere | `ENFORCED` (`tsconfig.app.json`) |
| Target | `ES2022` for `src`, `ES2023` for `vite.config.ts` | `ENFORCED` |
| Libs | `[ES2022, DOM, DOM.Iterable]` for `src`; `[ES2023]` (no DOM) for the Vite config | `ENFORCED` |
| Classes | None. Zero `class` declarations in `src/` | `CONVENTION` |
| `any` | Not used. `unknown` is used instead (`metadata?: Record<string, unknown>`, `isGameSessionResult(value: unknown)`) | `CONVENTION` |
| Non-null assertions (`!`) | Not used. Nullability is handled with `??`, `?.`, and explicit guards | `CONVENTION` |
| `as` casts | `as const` for literal tuples/palettes. Seven narrowing casts exist, all structural rather than error-suppressing: `as CSSProperties` (`Confetti.tsx:32`, needed for custom properties), `as keyof typeof RANK_TIERS` (`LeaderboardPage.tsx:69`), `as Record<string, unknown>` (`localResultRepository.ts:12`), `as Digits` (`gameEngine.ts:84`), `as StoppedCount` (`gameEngine.ts:86`), `as [number, number, number]` (`NumberWheelGame.tsx:53`), `as typeof target` (`NumberWheelGame.tsx:87`) — the last four re-pin a tuple type that `map`/spread widens to `number[]` | `CONVENTION` |

## TypeScript Strictness

`tsconfig.app.json` (all `ENFORCED`):

| Flag | Value | Practical consequence |
|---|---|---|
| `strict` | `true` | `strictNullChecks`, `noImplicitAny`, etc. all on |
| `noUnusedLocals` | `true` | An unused variable **fails `npm run build`** |
| `noUnusedParameters` | `true` | An unused parameter **fails the build** — prefix with `_` or remove it |
| `noFallthroughCasesInSwitch` | `true` | Every `switch` case must `return` or `break` |
| `noUncheckedSideEffectImports` | `true` | Side-effect imports must resolve |
| `verbatimModuleSyntax` | `true` | Type-only imports **MUST** be written `import type { X } from "..."`; a value import used only as a type is an error |
| `noEmit` | `true` | `tsc` is a checker only; Vite emits |
| `moduleResolution` | `bundler` | Extensionless relative imports resolve |
| `allowImportingTsExtensions` | `true` | Permitted but **not used** — no import in `src/` carries a `.ts`/`.tsx` extension |
| `skipLibCheck` | `true` | `node_modules` type errors are ignored |
| `moduleDetection` | `force` | Every file is a module |
| `useDefineForClassFields` | `true` | No effect — there are no classes |

Not enabled (so NOT required): `exactOptionalPropertyTypes`, `noImplicitReturns`,
`noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`, `isolatedDeclarations`.

## Import / Export Style

| Rule | Detail | Enforcement |
|---|---|---|
| Named exports everywhere | `export function X` / `export const X`. **`src/app/App.tsx` is the only default export in the repository** (`export default function App`) | `CONVENTION` |
| Type-only imports | `import type { … }` — 43 occurrences across 25 files | `ENFORCED` by `verbatimModuleSyntax` |
| Relative paths only | No path aliases exist (`vite.config.ts` sets no `resolve.alias`; `tsconfig` sets no `paths`). Cross-layer imports use `../../` | `ENFORCED` (no alias is configured) |
| No file extensions in imports | `"./types"`, not `"./types.ts"` | `CONVENTION` |
| Barrel files | Exactly one: `src/services/index.ts`. `src/domain/`, `src/components/`, `src/pages/` have **no** `index.ts` and are imported file-by-file | `CONVENTION` |
| CSS imports | `src/styles/*.css` in `src/main.tsx`; a game's stylesheet in that game's root component | `CONVENTION` |
| Props interfaces | Declared next to the component and **not exported**, except `NumberWheelProps` / `NumberWheelHandle` (needed by `WheelGroup` and the game shell) | `CONVENTION` |
| Import grouping | React first, then platform modules (`src/...` via relative paths), then local files, then CSS last | `CONVENTION` |

## Naming Conventions

| Kind | Convention | Examples |
|---|---|---|
| Components | `PascalCase` function declarations | `RegistrationPage`, `NumberWheel`, `Confetti` |
| Hooks | `useX` | `useAppSession`, `useNumberGame`, `usePrefersReducedMotion` |
| Types / interfaces | `PascalCase`, no `I` prefix, no `T` prefix | `GameContext`, `GameSessionResult`, `NumberWheelHandle` |
| Union string literals | `SCREAMING_SNAKE` for phases/states, `lowercase` for statuses | `"REGISTRATION"`, `"RUNNING"`, `"idle"`, `"saving"` |
| Module constants | `SCREAMING_SNAKE_CASE` | `MAX_GAME_ATTEMPTS`, `WHEEL_SPEEDS`, `MIN_STOP_INTERVAL_MS`, `STRIP_LENGTH` |
| Functions / variables | `camelCase` | `toCanonicalMobile`, `rollingFlags`, `mobileDigits` |
| Refs | `xxxRef` | `positionRef`, `submittedRef`, `completedRef`, `stripRef`, `wheelRefs` |
| Event handlers (props) | `onX` | `onComplete`, `onExit`, `onDigit`, `onBackspace`, `onConfirm`, `onStart`, `onDigitTap`, `onRandom` |
| Event handlers (local) | `handleX` | `handleSubmit`, `handleStop`, `handleRetry`, `handleDigitTap`, `handleRandomTarget` |
| Persian UI strings | Extracted to `SCREAMING_SNAKE` module constants when reused or when they are error/message text; inlined in JSX otherwise | `MOBILE_ERROR`, `ALREADY_PLAYED_MESSAGE`, `ZERO_MATCH_RETRY_MESSAGE`, `WHEEL_LABELS` |
| CSS classes | `block__element--modifier`, lowercase-hyphenated | `.number-wheel__strip`, `.leaderboard-row--gold` |

## File Naming Conventions

| Content | Convention | Examples |
|---|---|---|
| Component file | `PascalCase.tsx`, named after the exported component | `GamePage.tsx`, `NumberWheel.tsx` |
| Hook file | `camelCase.ts` starting with `use` | `usePrefersReducedMotion.ts`, `useNumberGame.ts` |
| Non-component module | `camelCase.ts` | `gameEngine.ts`, `prizeCalculator.ts`, `appConfig.ts`, `localResultRepository.ts` |
| Type-only module | `camelCase.ts` | `types.ts`, `game.ts`, `gameResult.ts` |
| Route/registry table | `camelCase.ts(x)` | `routes.tsx`, `registry.ts` |
| Game directory | `kebab-case` | `number-wheel/` |
| Game stylesheet | `kebab-case.css` matching the game id | `number-wheel.css` |
| Platform stylesheet | `lowercase.css` | `global.css`, `app.css` |

One file, one primary concern. `routes.tsx` uses `.tsx` because it references component values; `Game.ts`
is `.ts` because it only holds types.

## Component Patterns

| Pattern | Detail |
|---|---|
| Declaration form | `export function Name(props) { … }` — function declarations, never arrow-function components, never `React.FC` |
| Props typing | An inline object type for 1–2 props (`{ children }: { children: ReactNode }`), otherwise a local `interface XProps` |
| Destructuring | Props destructured in the parameter list, with defaults inline (`count = 64`, `attemptsRemaining = 0`) |
| Refs on components | **React 19 ref-as-prop**: `ref?: Ref<NumberWheelHandle>` declared inside `NumberWheelProps`. `forwardRef` is NOT used anywhere |
| Imperative handles | `useImperativeHandle(ref, () => ({ getCurrentDigit }), [])` — one narrow method, empty deps |
| Conditional rendering | Early `return null` (`GamePage` when session data is missing, `GameControls` on `RESULT`), and `&&` / ternaries in JSX |
| Class composition | Template literals plus arrays joined with `" "`; no `clsx`/`classnames` |
| Lists | `.map()` with a stable `key` (`piece.key`, index for the fixed 3-reel and dot arrays) |
| Memoization | `useMemo` only where identity matters (context value, `GameContext`, `speeds`, `result`, confetti pieces) and `useCallback` for every action exposed through context or passed into effects. `React.memo` is NOT used |
| Fragments | Shorthand `<>…</>` |
| Buttons | Always `<button type="button">` with an explicit `onClick`; `disabled` for unavailable actions |

## Hook Patterns

| Pattern | Detail |
|---|---|
| Custom hooks | Three only: `useAppSession` (context consumer that throws when unmounted from its provider), `usePrefersReducedMotion` (media-query subscription), `useNumberGame` (reducer + action creators) |
| Reducer usage | `useReducer(gameReducer, undefined, () => createInitialSnapshot(...))` — lazy initializer so the random target is generated once per mount |
| Action creators | Wrapped in `useCallback` with `[dispatch]`-stable identities so effects downstream don't re-subscribe needlessly |
| Effect cleanup | Every effect that starts something returns a cleanup: `cancelAnimationFrame`, `clearTimeout`, `removeEventListener`. `StrictMode` double-invocation is therefore safe |
| Once-only effects | Guarded by a ref set inside the effect (`completedRef`, `submittedRef`) rather than by dependency tricks |
| Layout effects | `useLayoutEffect` used once, in `NumberWheel`, to write the initial transform before first paint |
| Lazy state init | `useState(() => …)` when the initial value requires a browser API call (`usePrefersReducedMotion`) |
| Deps arrays | Always complete and explicit; no `// eslint-disable` comments (there is no ESLint) |

## State Management Patterns

- One React Context (`AppSessionProvider`) for cross-page session state; `useState` for local UI state;
  `useReducer` for the game's state machine; `useRef` for anything that must not trigger a render.
- All session state transitions go through named action functions using the
  `setState(prev => ({ ...prev, … }))` form, with guard clauses that return `prev` unchanged when a
  transition is invalid.
- Pure reducer: `gameReducer` returns the *same object* for invalid actions rather than a new one.
- The pure-core / imperative-shell split (`INFERRED` as an intentional pattern): `domain/`,
  `services/leaderboard.ts`, `utils/persian.ts`, `gameEngine.ts`, `prizeCalculator.ts` contain no React
  and no DOM; components hold all effects.

## Error Handling Patterns

| Pattern | Where | Detail |
|---|---|---|
| Throw on programmer error | `src/main.tsx` (missing `#root`), `useAppSession` (used outside provider) | Fail loudly, immediately |
| `try/catch` → status state | `AppSession.submitResult` / `retrySave` | **Bare `catch { }`** — the error object is not bound and not logged; state becomes `saveStatus: "error"` |
| `try/catch` → degrade to empty | `localResultRepository.loadAll` | Returns `[]` on any failure; corrupt entries filtered by a type guard |
| `try/catch` → fail open | `RegistrationPage.handleSubmit` | If the anti-replay lookup throws, the user is registered anyway (documented intent) |
| `try/catch` → error UI + retry | `LeaderboardPage.load` | Sets `loadState: "error"` and renders a retry button |
| `finally` for cleanup | `submitResult` (`savingRef = false`), `handleSubmit` (`checking = false`) | Always releases the guard |
| Runtime validation | `isGameSessionResult` in `localResultRepository.ts` | `typeof` checks over 11 fields before trusting stored JSON |
| Optional-call for optional APIs | `navigator.vibrate?.(ms)` | No feature-detection branch |
| Fallback chains | `crypto.randomUUID` → `Math.random`+`Date.now`; `getActiveGame()` → `GAME_DEFINITIONS[0]`; route lookup → `APP_ROUTES[0]` | Never crash on a missing lookup |

**No error boundary exists anywhere.** There is no `console.*` call, no logger, and no telemetry in
`src/` — failures are surfaced only through UI state. Any new `catch` MUST either surface the failure in
UI state or be justified, following the existing style.

## Async Patterns

- `async`/`await` only. There is no `.then()` chain in `src/`.
- Only three async functions exist: `localResultRepository.save`, `localResultRepository.getResults`
  (both `async` wrappers over synchronous `localStorage`), and the callers that `await` them
  (`AppSession.submitResult` / `retrySave`, `RegistrationPage.handleSubmit`, `LeaderboardPage.load`).
- The repository interface is `Promise`-based specifically so a network implementation can drop in
  unchanged.
- Concurrency control is a boolean ref (`savingRef`), not a queue or `AbortController`.
- No `AbortController`, no cancellation, no `Promise.all`, no race handling. `LeaderboardPage.load`
  does not guard against setting state after unmount (`INFERRED` acceptable: the page is never unmounted
  mid-load in the kiosk flow).
- Async work is triggered from event handlers and one `useEffect`; effects themselves are never `async`
  functions (they call an inner async function or a `useCallback`'d one).

## Testing Patterns

**None.** No test framework, no test file, no test script, no mock, no fixture, no test utility.

The `CLAUDE.md`-documented verification approach (temporary iframe harness in `public/` + headless Chrome
over CDP, deleted afterwards) is the de-facto substitute. See `09_BUILD_RUN_DEPLOY.md`.

If tests are ever added, the pure modules are the natural targets: `gameReducer`, `rollingFlags`,
`numberToDigits`/`digitsToNumber`, `countExactMatches`/`calculatePrizeResult`, `buildLeaderboard`,
`isValidMobileDigits`/`toCanonicalMobile`/`formatMaskedMobile`, `toPersianDigits`/`formatPersianNumber`.
`randomTargetNumber`, `randomDigits`, and `createNewGame` accept an injectable `rng` parameter, making them
deterministic under test without any mocking.

## Comment Style

| Pattern | Detail |
|---|---|
| File headers | A `/** … */` block at the top of nearly every module stating its responsibility and its constraints. 81 JSDoc blocks across 33 of the 35 files in `src/` (`src/main.tsx` and `src/vite-env.d.ts` have none) |
| Function docs | One-line `/** … */` above exported functions and constants |
| Inline `//` | Used sparingly for non-obvious mechanics (spring integration, modulo wrap, debounce rationale, why there is no on-screen stop button) |
| Constant annotations | Trailing `// comment` on config values (e.g. `PRIZE_EXACT_3 = 5_000_000; // all three digits correct`) |
| Language | English comments; Persian only inside user-facing string literals |
| Invariant documentation | Architectural rules are written as comments in the file that owns them (`src/domain/game.ts`, `src/app/AppSession.tsx`, `src/services/resultRepository.ts`, `src/games/number-wheel/components/NumberWheel.tsx`) |
| `TODO` / `FIXME` / `HACK` | None present |
| Commented-out code | One block: the `isMe` leaderboard highlight in `src/pages/LeaderboardPage.tsx` (lines 73, 86–90). See `12_KNOWN_GAPS_AND_RISKS.md` |

New code SHOULD carry a file-header block comment in the same style, and MUST document any invariant a
future change could silently break.

## Formatting Conventions (`CONVENTION` — no formatter is configured)

| Aspect | Observed |
|---|---|
| Indentation | 2 spaces |
| Quotes | Double quotes for strings and JSX attributes |
| Semicolons | Always |
| Trailing commas | Yes, in multi-line parameter lists, arrays, and object literals |
| Line width | ~100 characters; long JSX attribute lists wrapped one per line |
| Numeric literals | Numeric separators for large values (`5_000_000`) |
| Arrow functions | Used for callbacks and inline handlers; never for component declarations |
| Blank lines | One blank line between logical blocks; none immediately after an opening brace |

There is no Prettier or EditorConfig file, so formatting is maintained by imitation. Match the
surrounding file.

## Repeated Patterns Worth Following

1. **Fake input surface**: a `<div role="textbox" aria-label=…>` styled as a field plus
   `VirtualNumericKeyboard` — or the redesigned `ui/Keypad`/`ui/ChoiceGrid` equivalents.
   Never add a real `<input>`.
2. **Persian display conversion at the edge**: call `toPersianDigits` / `formatPersianNumber` in JSX only.
   State and storage stay Latin.
3. **Guard-clause reducers/actions**: validate, `return prev` (or the same state object) when the
   transition is illegal.
4. **Ref-guarded once-only side effects**: `completedRef`, `submittedRef`, `savingRef`.
5. **Injectable randomness**: default parameter `rng: () => number = Math.random`.
6. **Config constants over magic numbers**: tuning values live in a `config.ts`, not inline. (Exception by
   design: `NumberWheel.tsx`'s geometry/settle constants, and the two `navigator.vibrate` durations.)
7. **Derive, don't store**: `rollingFlags`, `activeIndex`, `canRetry`, prize results are all computed from
   minimal state.
8. **Interface-first services**: code against `GameResultRepository`, select the implementation in
   `src/services/index.ts`.
9. **Status-union state machines**: `SaveStatus`, `LoadState`, `GameState` as string-literal unions rather
   than booleans.
10. **Reset by remount**: change the `key` instead of writing a reset action.

## Patterns Intentionally Avoided

| Avoided | Evidence |
|---|---|
| Router library / URL state | `src/app/routes.tsx` implements a phase switch; `README.md` states "no router library" |
| External state management (Redux, Zustand, Jotai, MobX) | Zero dependencies; one Context |
| `class` components, `React.FC`, `forwardRef` | None in `src/` |
| `any`, non-null `!`, `@ts-ignore`, `@ts-expect-error` | None in `src/` |
| Real `<input>` / `<form>` elements | Kiosk constraint; the on-screen keyboard replaces them |
| Canvas / WebGL / a game engine | `README.md` states "no canvas, no game engine" |
| CSS frameworks, preprocessors, CSS-in-JS | Plain CSS only |
| Icon libraries | Unicode glyphs only |
| Per-frame React state during animation | `NumberWheel` writes `style.transform` through a ref |
| In-game replay | Reset is a remount driven by `key` |
| Dynamic imports / code splitting | Games are statically imported in `src/games/registry.ts` |
| `console` logging / telemetry | No `console.*` call in `src/` |
| Environment variables / runtime config | All tuning is TypeScript constants |
| `letter-spacing` on Persian text | Only on Latin-digit runs |
| Page scrolling | Only `.leaderboard` scrolls |
