# DOC_ID: AI-01_PROJECT_OVERVIEW
# SCOPE: High-level project description, stack, features, constraints
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - package.json
# - package-lock.json
# - index.html
# - vite.config.ts
# - tsconfig.app.json
# - src/config/appConfig.ts
# - src/games/number-wheel/config.ts
# - README.md
# - CLAUDE.md

## What The Application Does

A vertical-touchscreen kiosk app for conference booths. It walks one attendee at a time through a
fixed 4-step journey, runs a minigame, persists the outcome (the registration page shows the live
«برترینهای امروز» panel), then resets for the next attendee. There is no separate leaderboard page.

Journey (`AppPhase` values, in order — `src/app/routes.tsx`):

| Phase | Page component | Collects / does |
|---|---|---|
| `REGISTRATION` | `RegistrationPage` | Mobile number (the player's only identity). Rejects a mobile that already has a stored result. Embeds the «برترینهای امروز» leaderboard panel (top-5 by stored prize). |
| `SURVEY` | `SurveyPage` | `employeeCount` (4 range cards → 10/50/300/301) + `hasBenefits` (yes/no), or a "not employed" skip |
| `CATEGORY` | `CategorySelectionPage` | One sector from `CATEGORIES` |
| `GAME` | `GamePage` | Hosts the active game, builds + persists `GameSessionResult`, offers retry; result screens route back to registration (`startNewUser`) |

## What The Minigame Does

Active game id: `number-wheel` (`ACTIVE_GAME_ID` in `src/config/appConfig.ts`).
Registry display name: `بازی اعداد`. The play screen is the redesigned «ماشین شانس» slot-game page
(Figma frame 5); the result screens (frames 6–8) render in the host (`src/pages/GameResult.tsx`).
(`GAME_TITLE` was removed from the game config in the redesign.)

- Three vertical digit reels (hundreds, tens, ones — left to right) plus an editable 3-digit **target**.
- While `IDLE` the target can be edited digit-by-digit (tap cycles `+1 mod 10`) or randomized.
- `START` spins all three reels. Each subsequent activation locks the **leftmost still-rolling** reel at
  whatever digit is centered at that instant. The third lock ends the round.
- Prize is paid **only for exact positional digit matches** against the target. Closeness pays nothing.
- Prize table (`src/games/number-wheel/config.ts`): 3 matches = `5_000_000`, 2 = `1_000_000`,
  1 = `500_000`, 0 = `0`. Currency label `تومان`.
- `score` and `winAmount` reported to the platform are both equal to the prize amount.

Full mechanics: `05_MINIGAME.md`.

## Primary User-Facing Purpose

Lead capture + engagement at a conference booth: a mobile number and a two-question organization
survey are exchanged for a chance at a prize, with a public leaderboard as social proof.

## Stack
- Language: TypeScript 5.8 (`~5.8.3`), `strict: true`
- UI library: React 19 (`^19.1.0`) + `react-dom` (`^19.1.0`)
- Framework/build tool: Vite 7 (`^7.0.0`) with `@vitejs/plugin-react` (`^5.0.0`); no meta-framework
- Styling: hand-written plain CSS, three global stylesheets, BEM-ish class names, CSS custom properties. No Tailwind, no CSS Modules, no CSS-in-JS.
- State: React `useState` in one Context provider (`AppSessionProvider`) + `useReducer` inside the game + `useRef` for animation/guard state. No external state library.
- Testing: NONE. No test framework, no test files, no test script.
- Deployment: UNKNOWN — no CI config. A Docker scaffold was added at the repo root on 2026-08-26 (`docker-compose.yml`, `docker-compose.dev.yml`, `exhibition.sh`) with `Dockerfile`s in `frontend/`, `backend/`, and `panel/` (the latter two have no application code yet). Build output is a static `dist/` directory servable by any static host; `frontend/nginx.conf` adds SPA fallback + `/api`/`/ws` proxying to the backend. `README.md` documents launching Chrome in kiosk mode against a URL.

## Package Manager

npm. Evidence: `package-lock.json` present at root; no `yarn.lock`, no `pnpm-lock.yaml`.

## Runtime Environment

- Browser only. Client-rendered SPA. No SSR, no server code, no API routes, no service worker.
- Browser APIs used directly: `localStorage`, `requestAnimationFrame`, `performance.now()`,
  `window.matchMedia`, `crypto.randomUUID` (with a `Math.random` fallback), `navigator.vibrate` (optional call),
  `window.setTimeout`, `window.addEventListener("keydown", …)`.
- Target: Chrome in `--kiosk` mode on a vertical touchscreen (per `README.md`). Also works in any modern browser.
- Node.js is required only to run Vite. No engine constraint is declared in `package.json`.

## Application Type

**SPA, fully static, client-only.** Single HTML entry (`index.html`), single JS entry (`src/main.tsx`).

## Major Features Currently Present

- Phase-switch navigation with no URL changes and no history integration.
- Pluggable game contract with a registry and a single active-game selector.
- On-screen numeric keyboard; no real `<input>` elements anywhere.
- Anti-replay: registration blocks a mobile that already has a stored result (fail-open on repository error).
- Retry chain: after a **zero-win** result the host offers up to `MAX_GAME_ATTEMPTS` (3) total attempts; any win ends the chain. Every stored result carries its `attempt` number.
- Save-status UI with an explicit retry-save action on persistence failure.
- Leaderboard panel on the registration page, computed purely from stored results (top 5, gold first row).
- Masked mobile display on public screens (`0910****113`); the entered 09-form stored unmasked.
- Persian numeral rendering at the display layer only.
- A redesigned visual language for page 1 (mobile entry): design-scale mechanism
  (`src/app/designScale.ts`, canvas 1080×1800), a `--ds-*` token set, and shared `src/components/ui/`
  components (PageShell, StepTracker, Keypad, PhoneDisplay, LeaderboardPanel, …). Documented in
  `ai-docs/design-system.md`; pages 2–5 will be restyled with the same system.
- `prefers-reduced-motion` support (see the caveat in `12_KNOWN_GAPS_AND_RISKS.md`).
- Presenter keyboard control of the game (PageUp / PageDown / `b` / F5 / Ctrl+R / Cmd+R).
- Dependency-free CSS confetti on a perfect result.

## Major Constraints Visible From The Code

| Constraint | Source |
|---|---|
| No runtime dependency beyond React | `package.json` `dependencies` |
| `noEmit: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` | `tsconfig.app.json` |
| Type-check is the only automated gate: `npm run build` = `tsc -b && vite build` | `package.json` `scripts.build` |
| Games MUST NOT import pages, services, or the session | `src/domain/game.ts` doc comment; verified by import graph |
| `onComplete` called exactly once | `src/domain/game.ts` doc comment; enforced by `completedRef` in `NumberWheelGame.tsx` and `submittedRef` in `GamePage.tsx` |
| Game reset = component remount (`key={user.id}:{attempt}`) — there is no in-game replay | `src/pages/GamePage.tsx`, `src/games/number-wheel/useNumberGame.ts` doc comment |
| Whole UI must fit the viewport without scrolling | `src/styles/global.css`, `src/styles/app.css` |
| Vite dev server binds all interfaces (`server.host: true`) for LAN testing | `vite.config.ts` |

## Explicit Project Rules Stated In README.md / CLAUDE.md

These are documented intentions. Where code disagrees, code wins — disagreements are listed in
`12_KNOWN_GAPS_AND_RISKS.md`.

- Adding a game requires only: create `src/games/<id>/`, register in `src/games/registry.ts`, set `ACTIVE_GAME_ID`. Registration, category selection, leaderboard, and persistence need no changes.
- The number-wheel game is a replaceable module, not the application core.
- Pages depend only on the `GameResultRepository` interface; swapping `src/services/index.ts` is the only change needed for a backend.
- Persian numerals are display-only; logic and stored data use Latin digits and ISO timestamps.
- Never add `letter-spacing` to Persian text (it breaks the joined script); emphasis via weight/size/color.
- Numeric sequences stay LTR.
- Keep the kiosk free of real `<input>` elements.
- Verification convention (from `CLAUDE.md`): an iframe harness page in `public/` driven by headless Chrome over CDP, deleted afterwards. React 18+ batches state in a microtask, so synthetic `.click()` calls need ~30 ms gaps.
