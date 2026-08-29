# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All npm commands run inside `frontend/` — the React app. The repo root also holds the Docker orchestration for it: `docker-compose.yml` / `docker-compose.dev.yml` / `exhibition.sh`. There is no backend; the app is fully client-side (persistence is browser localStorage).

```bash
cd frontend
npm install
npm run dev        # dev server, LAN-reachable (host: true)
npm run build      # tsc -b && vite build — the type check gate
npm run preview    # serve dist/ locally
```

There is no test framework, linter, or test script. The de-facto way to verify this app is headless Chrome against the dev server: an iframe harness page in `public/` drives the real app via `.click()`, writes results into a `<pre>`, and a small CDP driver (Node's built-in `WebSocket` + `fetch http://127.0.0.1:9222/json/new?...` with PUT) captures the DOM, console errors, and exceptions under **real time** (`--virtual-time-budget` freezes CSS transitions, so it is only usable for logic/flow checks, not computed styles). Delete harnesses afterwards so they don't ship in `dist/`.

**Gotcha:** React 18+ flushes state updates in a microtask — synthetic `.click()` calls in a tight loop all see the same stale state. Put ~30ms gaps between synthetic clicks (real touch events are separate tasks and never hit this).

## Architecture

Persian (RTL) conference kiosk platform — React 19 + TS + Vite, no runtime deps beyond React, no router library. **Every `src/` and `public/` path below is relative to `frontend/`** (the app root); `ai-docs/` lives inside `frontend/` too. Navigation is a phase switch (`REGISTRATION → SURVEY → CATEGORY → GAME`) inside `src/app/AppSession.tsx`, the single session store. There is no separate leaderboard page — the registration page embeds the live «برترینهای امروز» panel, and every result screen routes back there (`startNewUser`). The category page's «بازگشت» returns to the survey (`goBackToSurvey` — the previous step, user kept), while the survey's own step-1 back still does the full `startNewUser` reset. Pages consume it via `useAppSession()`; nothing is duplicated between pages. The SURVEY step collects `SurveyAnswers` (organization headcount + benefits yes/no, `src/domain/survey.ts`) and `GamePage` folds it into every persisted `GameSessionResult` as `employeeCount` / `hasBenefits`. Non-working users can check «در سازمان یا شرکتی کار نمیکنم» to skip both questions (stored as `employeeCount: 0, hasBenefits: false`).

### Pluggable games (the core contract)

`src/domain/game.ts` defines the contract the whole platform is built around:

```text
GameContext { userId, firstName, lastName, mobile, sector } → Game → GameResult { score, winAmount, metadata? }
GameProps { context, onComplete, onExit }
```

- Games live in `src/games/<id>/` and must never import pages, services, or the session — they play and report only. `onComplete` must be called **exactly once** (the wheel game guards with a ref + effect on `RESULT`). `GameContext` also carries optional `attemptsRemaining` / `attemptsTotal` (retries left after this attempt / total attempts allowed) so games can reflect attempt state. Zero-match result messaging lives in the host — `GameResultScreen` (`src/pages/GameResult.tsx`) shows «هنوز N فرصت دیگر دارید!» while retries remain and the game-over sentence on the last attempt.
- Register new games in `src/games/registry.ts` and select via `ACTIVE_GAME_ID` in `src/config/appConfig.ts`. Nothing else in the platform needs to change (proven with a temporary stub game).
- `src/pages/GamePage.tsx` is the adapter: it builds the combined `GameSessionResult` (user + survey + sector + gameId + playedAt + attempt + game result) and persists it. It remounts the game with `key={user.id}:{attempt}` — a new user or a retry always gets a completely fresh game (this is also how the wheel game resets: no in-game replay). After a **zero-win** result the host offers «تلاش دوباره» up to `MAX_GAME_ATTEMPTS` (config); any win ends the retry chain. Every stored result carries its `attempt` number.
- Game styles ship with the game (`src/games/number-wheel/number-wheel.css`); the platform only provides the shared `.confetti` primitive in `src/styles/app.css` (page shells live in `src/components/ui/PageShell` + the design-system stylesheets).

### Persistence & leaderboard

Pages depend only on the `GameResultRepository` interface (`src/services/resultRepository.ts`); the active implementation is chosen in `src/services/index.ts` (currently localStorage, key `smartis-game.results.v1`, tolerant of corrupt data). `src/services/leaderboard.ts` builds entries purely: best score per user, sort by score desc, ties by earlier `playedAt` then `userId`, sequential ranks. Leaderboard rows never hard-code data.

### Game module internals

Each game in `src/games/<id>/` is self-contained (own `config.ts` for organizer tuning, pure `gameEngine.ts`, `prizeCalculator.ts`, `styles.css`); shared primitives live at platform level: `.confetti` in `styles/app.css`, `Confetti` in `src/components/`, `usePrefersReducedMotion` in `src/hooks/`.

- **Number wheel**: pure reducer in `gameEngine.ts` (`stoppedCount` 0–3; STOP locks the leftmost rolling wheel; third STOP → `RESULT`; roll state derived via `rollingFlags`; `SET_TARGET` action edits the target while IDLE only). `components/NumberWheel.tsx` animates a 30-digit strip via `translate3d` written straight to the DOM through a ref each rAF frame — React never re-renders while spinning. Position wraps modulo 10 for a seamless loop; stopping integrates a damped spring to the digit nearest the stop position (momentum inherited from spin). Cleanup cancels all rAF loops. **Input model**: START stays a visible touchscreen button, and the presenter can drive the whole round from a keyboard — PageUp / PageDown / `b` / F5 / Ctrl+R start the game from IDLE and act as the three STOP presses while RUNNING (a game-scoped `keydown` listener in `NumberWheelGame.tsx`, auto-repeat ignored). The refresh shortcuts are `preventDefault`-ed so the kiosk never reloads. While RUNNING a large on-screen «توقف» button (288×128, cyan gradient, `.slot-game__stop`) stops the next rolling wheel — the same path as the presenter keys. At IDLE the target is editable — tap digits to cycle them, or press «عدد تصادفی» (the target is persisted in result metadata) — and a glass rules panel (3 rules + 3 prize cards from the game's own `config.ts` prizes) explains the game. While RUNNING the next wheel to stop is highlighted with a cyan border + glow (`.number-wheel--active` pulse).
- Platform config (categories, active game) is in `src/config/appConfig.ts`; per-game tuning lives in each game's `config.ts`.

### RTL / Persian rules

- `index.html` is `lang="fa" dir="rtl"`. All user-facing text is Persian.
- `src/utils/persian.ts` (`toPersianDigits`) converts Latin digits to Persian numerals **at the display layer only** — game logic and stored data always use Latin digits (e.g. mobile `09108086113` — the full 11-digit 09-form, stored exactly as entered with no `+98` prefix — and ISO timestamps).
- Numeric sequences must stay LTR: `.wheel-group`, `.reel-labels`, `.slot-game__target`, the result screens' digit/target/prize values, the registration leaderboard panel's mobile column, and the keypad all set `direction: ltr` explicitly (hundreds digit is always leftmost; wheel 0 locks first).
- Never add `letter-spacing` to Persian text — it breaks the joined script. Emphasis comes from weight/size/color.
- Font: bundled `public/BYekan+.ttf` registered as `"B Yekan"` in `global.css` (Regular only; 600–800 weights are browser-synthesized) — now only the last-resort fallback in every font stack. The pages use Vazirmatn (`public/fonts/Vazirmatn/`, weights 400–700) plus the IRANYekanXFaNum family (`--ds-font-fanum` statics for digit runs; variable `--ds-font-fanum-vf` for Persian text; all `@font-face` in `src/styles/design-tokens.css`).

### Kiosk constraints

- No real `<input>` elements anywhere — the mobile field is a tappable surface driven by the on-screen numeric keyboard (`src/components/ui/Keypad.tsx`), so the browser/OS keyboard never appears. Keep it that way. The mobile number is the player's identity (no name collection): `User` has only `{ id, mobile }`. The user enters the full 11-digit 09-form (`09108086113`); it is stored/reported **exactly as entered** (no `+98` prefix, no other modification) and stays in Latin digits (the bundled fonts render Persian glyph shapes). On the registration leaderboard panel the mobile is shown **masked** (`0910****113` via `formatPanelMobile` in `src/domain/user.ts` — 4 middle digits hidden, display-only). Registration rejects a mobile that already has a stored result («شما قبلاً در این مسابقه شرکت کردهاید.» — the anti-replay check, fail-open if the repository errors).
- No page scrolling (the registration leaderboard panel shows top-5 — nothing scrolls), `user-select: none`, `touch-action: manipulation` on everything tappable, context menu blocked at the app root.
- `prefers-reduced-motion` slows the wheels and disables decorative animations; the game stays functional.
