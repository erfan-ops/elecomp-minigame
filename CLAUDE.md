# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # dev server, LAN-reachable (host: true)
npm run build      # tsc -b && vite build — the type check gate
npm run preview    # serve dist/ locally
```

There is no test framework, linter, or test script. The de-facto way to verify this app is headless Chrome against the dev server: an iframe harness page in `public/` drives the real app via `.click()`, writes results into a `<pre>`, and a small CDP driver (Node's built-in `WebSocket` + `fetch http://127.0.0.1:9222/json/new?...` with PUT) captures the DOM, console errors, and exceptions under **real time** (`--virtual-time-budget` freezes CSS transitions, so it is only usable for logic/flow checks, not computed styles). Delete harnesses afterwards so they don't ship in `dist/`.

**Gotcha:** React 18+ flushes state updates in a microtask — synthetic `.click()` calls in a tight loop all see the same stale state. Put ~30ms gaps between synthetic clicks (real touch events are separate tasks and never hit this).

## Architecture

Persian (RTL) conference kiosk platform — React 19 + TS + Vite, no runtime deps beyond React, no router library. Navigation is a phase switch (`REGISTRATION → CATEGORY → GAME → LEADERBOARD`) inside `src/app/AppSession.tsx`, the single session store. Pages consume it via `useAppSession()`; nothing is duplicated between pages.

### Pluggable games (the core contract)

`src/domain/game.ts` defines the contract the whole platform is built around:

```text
GameContext { userId, firstName, lastName, mobile, sector } → Game → GameResult { score, winAmount, metadata? }
GameProps { context, onComplete, onExit }
```

- Games live in `src/games/<id>/` and must never import pages, services, or the session — they play and report only. `onComplete` must be called **exactly once** (the wheel game guards with a ref + effect on `RESULT`).
- Register new games in `src/games/registry.ts` and select via `ACTIVE_GAME_ID` in `src/config/appConfig.ts`. Nothing else in the platform needs to change (proven with a temporary stub game).
- `src/pages/GamePage.tsx` is the adapter: it builds the combined `GameSessionResult` (user + sector + gameId + playedAt + game result) and persists it. It remounts the game with `key={user.id}` — a new user always gets a completely fresh game (this is also how the wheel game resets: no in-game replay).
- Game styles ship with the game (`src/games/number-wheel/number-wheel.css`); the platform only provides shared primitives (`.btn`, `.chip`, page layout) in `src/styles/app.css`.

### Persistence & leaderboard

Pages depend only on the `GameResultRepository` interface (`src/services/resultRepository.ts`); the active implementation is chosen in `src/services/index.ts` (currently localStorage, key `smartis-game.results.v1`, tolerant of corrupt data). `src/services/leaderboard.ts` builds entries purely: best score per user, sort by score desc, ties by earlier `playedAt` then `userId`, sequential ranks. Leaderboard rows never hard-code data.

### Game module internals

Each game in `src/games/<id>/` is self-contained (own `config.ts` for organizer tuning, pure `gameEngine.ts`, `prizeCalculator.ts`, `styles.css`); shared primitives live at platform level: `.btn`/`.btn--start`/`.btn--stop`/`.confetti` in `styles/app.css`, `Confetti` in `src/components/`, `usePrefersReducedMotion` in `src/hooks/`.

- **Number wheel**: pure reducer in `gameEngine.ts` (`stoppedCount` 0–3; STOP locks the leftmost rolling wheel; third STOP → `RESULT`; roll state derived via `rollingFlags`). `components/NumberWheel.tsx` animates a 30-digit strip via `translate3d` written straight to the DOM through a ref each rAF frame — React never re-renders while spinning. Position wraps modulo 10 for a seamless loop; stopping integrates a damped spring to the digit nearest the stop position (momentum inherited from spin). Cleanup cancels all rAF loops.
- **Ten second**: the authoritative elapsed time comes ONLY from `performance.now()` timestamps captured at START and STOP (in `gameEngine.ts`, injected as reducer action payloads so the logic stays pure/testable). The rAF loop in `TenSecondGame.tsx` is pure presentation — it writes the visible timer text and its fade-out opacity through refs; never feed its values back into scoring. `onComplete` fires exactly once via a ref-guarded effect on `RESULT`; game reset = component remount (no in-game replay, same as number-wheel).
- Platform config (categories, active game) is in `src/config/appConfig.ts`; per-game tuning lives in each game's `config.ts`.

### RTL / Persian rules

- `index.html` is `lang="fa" dir="rtl"`. All user-facing text is Persian.
- `src/utils/persian.ts` (`toPersianDigits`) converts Latin digits to Persian numerals **at the display layer only** — game logic and stored data always use Latin digits (e.g. canonical mobile `+989121234567`, ISO timestamps).
- Numeric sequences must stay LTR: `.wheel-group`, `.stop-dots`, target/result values, and the mobile field control all set `direction: ltr` explicitly (hundreds digit is always leftmost; wheel 0 locks first).
- Never add `letter-spacing` to Persian text — it breaks the joined script. Emphasis comes from weight/size/color.
- Font: bundled `public/BYekan+.ttf` registered as `"B Yekan"` in `global.css` (Regular only; 600–800 weights are browser-synthesized).

### Kiosk constraints

- No real `<input>` elements anywhere — form fields are tappable surfaces driven by the on-screen keyboards (`src/components/VirtualNumericKeyboard.tsx`, `VirtualKeyboard.tsx`), so the browser/OS keyboard never appears. Keep it that way.
- No page scrolling (only the leaderboard list scrolls internally), `user-select: none`, `touch-action: manipulation` on everything tappable, context menu blocked at the app root.
- `prefers-reduced-motion` slows the wheels and disables decorative animations; the game stays functional.
