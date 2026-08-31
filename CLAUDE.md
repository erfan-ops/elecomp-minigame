# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All npm commands run inside `frontend/` — the React app. The repo root also holds the Docker orchestration for it (`docker-compose.yml` / `docker-compose.dev.yml` / `exhibition.sh`), the one-command desktop build (`build.ps1`, see Architecture → Python backend → Packaging), and the Python **pywebview backend** in `backend/` (see Architecture → Python backend). The app itself is fully client-side (persistence is browser localStorage); the backend is a desktop wrapper that renders the built frontend and exports every completed game iteration to disk.

```bash
cd frontend
npm install
npm run dev        # dev server, LAN-reachable (host: true)
npm run build      # tsc -b && vite build — the type check gate
npm run preview    # serve dist/ locally
```

Backend (Python >= 3.12, uv project, sole dependency `pywebview`):

```bash
cd backend
uv sync                    # first time — creates .venv
.venv/Scripts/python.exe main.py   # fullscreen webview; exports land in backend/output
```

**Sync step:** `backend/frontend/` is a mirror copy of `dist/`. After every `npm run build`, copy the fresh `index.html` + `assets/` over it (delete stale hashed bundles) — otherwise the webview runs the old JS and the export silently never happens.

There is no test framework, linter, or test script. The de-facto way to verify this app is headless Chrome against the dev server: an iframe harness page in `public/` drives the real app via `.click()`, writes results into a `<pre>`, and a small CDP driver (Node's built-in `WebSocket` + `fetch http://127.0.0.1:9222/json/new?...` with PUT) captures the DOM, console errors, and exceptions under **real time** (`--virtual-time-budget` freezes CSS transitions, so it is only usable for logic/flow checks, not computed styles). Delete harnesses afterwards so they don't ship in `dist/`.

**Gotcha:** React 18+ flushes state updates in a microtask — synthetic `.click()` calls in a tight loop all see the same stale state. Put ~30ms gaps between synthetic clicks (real touch events are separate tasks and never hit this).

## Architecture

Persian (RTL) conference kiosk platform — React 19 + TS + Vite, no runtime deps beyond React, no router library. **Every `src/` and `public/` path below is relative to `frontend/`** (the app root); `ai-docs/` lives inside `frontend/` too. Navigation is a phase switch (`REGISTRATION → SURVEY → CATEGORY → GAME`) inside `src/app/AppSession.tsx`, the single session store. There is no separate leaderboard page — the registration page embeds the live «برترینهای امروز» panel and the «آمار مسابقه» stats panel (total prize paid out, distinct players, winners per exact-match count, from `src/services/stats.ts`), and every result screen routes back there (`startNewUser`). The category page's «بازگشت» returns to the survey (`goBackToSurvey` — the previous step, user kept), while the survey's own step-1 back still does the full `startNewUser` reset. Pages consume it via `useAppSession()`; nothing is duplicated between pages. The SURVEY step collects `SurveyAnswers` (organization headcount + benefits yes/no, `src/domain/survey.ts`) and `GamePage` folds it into every persisted `GameSessionResult` as `employeeCount` / `hasBenefits`. Non-working users can pick the «در سازمان یا شرکتی کار نمی‌کنم» card (the full-width fifth option in survey step 1's `ChoiceGrid`) to skip both questions (stored as `employeeCount: 0, hasBenefits: false`).

### Pluggable games (the core contract)

`src/domain/game.ts` defines the contract the whole platform is built around:

```text
GameContext { userId, mobile, sector, attemptsRemaining?, attemptsTotal?, budgetConsumedRatio? } → Game → GameResult { score, winAmount, metadata? }
GameProps { context, onComplete, onExit }
```

- Games live in `src/games/<id>/` and must never import pages, services, or the session — they play and report only. `onComplete` must be called **exactly once** (the wheel game guards with a ref + effect on `RESULT`). `GameContext` also carries optional `attemptsRemaining` / `attemptsTotal` (retries left after this attempt / total attempts allowed) so games can reflect attempt state, and optional `budgetConsumedRatio` (share of the organizer's prize budget already paid out, 0–1) so games can scale difficulty — the number-wheel game multiplies its reel speeds by `DIFFICULTY_MULTIPLIERS` rows as the consumed share crosses `DIFFICULTY_THRESHOLDS` percentages (`src/games/number-wheel/config.ts` + `difficulty.ts`). Wins are recorded by `GamePage.handleComplete` via `recordPrize` (`src/services/budget.ts`, localStorage key `smartis-game.budget.v1`, stores only `{ consumed }` — the `BUDGET` constant in the game's config stays authoritative). Zero-match result messaging lives in the host — `GameResultScreen` (`src/pages/GameResult.tsx`) shows «هنوز N فرصت دیگر دارید!» while retries remain and the game-over sentence on the last attempt.
- Register new games in `src/games/registry.ts` and select via `ACTIVE_GAME_ID` in `src/config/appConfig.ts`. Nothing else in the platform needs to change (proven with a temporary stub game).
- `src/pages/GamePage.tsx` is the adapter: it builds the combined `GameSessionResult` (user + survey + sector + gameId + playedAt + attempt + game result) and persists it. It remounts the game with `key={user.id}:{attempt}` — a new user or a retry always gets a completely fresh game (this is also how the wheel game resets: no in-game replay). After a **zero-win** result the host offers «تلاش دوباره» up to `MAX_GAME_ATTEMPTS` (config); any win ends the retry chain. Every stored result carries its `attempt` number.
- Game styles ship with the game (`src/games/number-wheel/number-wheel.css`); the platform only provides the shared `.confetti` primitive in `src/styles/app.css` (page shells live in `src/components/ui/PageShell` + the design-system stylesheets).

### Persistence & leaderboard

Pages depend only on the `GameResultRepository` interface (`src/services/resultRepository.ts`); the active implementation is chosen in `src/services/index.ts` (currently localStorage, key `smartis-game.results.v1`, tolerant of corrupt data). The prize budget shares that layer: `getBudgetState` / `recordPrize` in `src/services/budget.ts` (localStorage key `smartis-game.budget.v1`, only `{ consumed }` persisted). `src/services/leaderboard.ts` builds entries purely: best score per user, sort by score desc, ties by earlier `playedAt` then `userId`, sequential ranks. Leaderboard rows never hard-code data. Alongside the repository, every completed iteration is also exported to disk by the Python backend (next section).

### Python backend (pywebview host)

`backend/main.py` is a pywebview desktop wrapper that renders `backend/frontend/index.html` in a fullscreen window with `js_api=Api()`. The API is semantic — not a generic filesystem hole — with exactly one method:

- `Api.export_game_result(data)` — exposed to JS as `window.pywebview.api.export_game_result`. **Naming gotcha:** pywebview 6 registers each method under its verbatim Python name — there is **no** snake_case→camelCase conversion. Python owns the output directory (`backend/output/`, created automatically), the local date, the sequence numbers, and all filesystem writes: `game_data_YYYY-MM-DD_NNN.json` (one permanent record per completed iteration; `NNN` is the next unused sequence number for that day, reserved with an exclusive create so iterations never collide) and `game_data_YYYY-MM-DD.json` (a JSON **array of every iteration recorded that day** — all users, in sequence order — rebuilt from the sequential files on each export so it self-heals, and replaced atomically).

The backend logs to the console **and** to `backend/pywebview.log`: startup (frozen flag + the resolved frontend/output paths), the JS API methods pywebview actually exposed (a startup self-check), every export request (`mobile`/`attempt`/`gameId`), written file paths, and any write failure (traceback). In a windowed PyInstaller build there is no console stream, so only the file handler is attached.

**Packaging (PyInstaller):** `build.ps1` at the repo root is the one-command path — `npm run build` → wipe-and-mirror `frontend/dist` into `backend/frontend` → PyInstaller (it also `npm install`/`uv sync`/installs pyinstaller when missing, and moves an existing `dist/smartis-game/output/` aside and back, because `-y` would delete the exported game data). **Keep `build.ps1` pure ASCII:** Windows PowerShell 5.1 decodes `.ps1` as the system ANSI codepage unless the file has a UTF-8 BOM, so a UTF-8 em dash becomes `â€”` — and PowerShell treats that trailing `”` (U+201D) as a string terminator, so one em dash inside a double-quoted string cascades into bogus "missing closing `}`" parse errors. By hand: sync `backend/frontend/` first, then from `backend/` run `.\.venv\Scripts\pyinstaller.exe -y -D -w -n smartis-game --add-data "frontend;frontend" .\main.py` → `dist/smartis-game/smartis-game.exe`. Onedir, not onefile: `output/` must survive the process. `_base_dirs()` splits the two roots a frozen app needs — `BASE_DIR` (writable: `output/`, the log) is the **.exe's folder**, `BUNDLE_DIR` is PyInstaller's `_internal/` payload; running from source both are `backend/`. Using `Path(__file__)` for either is the 404/lost-exports bug. A `frontend/` placed next to the .exe overrides the bundled copy, so a fresh `npm run build` can be dropped in without re-running PyInstaller.

Frontend side, `src/services/gameExporter.ts` provides `exportGameResult(result)` — the only module allowed to touch `window.pywebview`. `GamePage.handleComplete` calls it fire-and-forget alongside `session.submitResult`, exactly once per completed game iteration (a retry is a new iteration and exports again with its own `attempt` number). A missing bridge (dev server, nginx/Docker) is a fully silent no-op; when the bridge **is** present but the method is missing or the call rejects, the exporter emits a `console.warn` so the integration problem is diagnosable. The kiosk flow and `saveStatus` never depend on the export.

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
- The page shell is a fixed 1080×1800 design canvas (the `--ds-canvas-w` / `--ds-canvas-h` tokens), scaled by `--s` (`src/app/designScale.ts`) and centered both horizontally and vertically by `.app`; on screens with a different aspect ratio the dark background extends into the letterboxed space.
- `prefers-reduced-motion` disables decorative animations and the spin blur; the game stays fully functional (wheel speed is unchanged — `REDUCED_MOTION_SPEED_FACTOR` is 1).
