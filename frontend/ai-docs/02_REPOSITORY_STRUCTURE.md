# DOC_ID: AI-02_REPOSITORY_STRUCTURE
# SCOPE: Directory and root-file map
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - (filesystem walk of the working tree)
# - .gitignore
# - package.json
# - tsconfig.json

## Top-Level Tree (working tree, excluding generated/dependency dirs)

The React app and **all of its supporting files** — including this `ai-docs/` package — live under
`frontend/`. **Every path in this documentation package is relative to `frontend/`** unless the
`<repo-root>/` prefix is written explicitly. The repo root holds the orchestration files
(`CLAUDE.md`, the Docker compose files, `exhibition.sh`, ignore files), the `frontend/` directory,
and the `backend/` directory (the Python pywebview wrapper).

```
<repo-root>/
├── .claude/
│   └── settings.local.json
├── .dockerignore              (docker build ignores: node_modules, dist, logs, .git, .env)
├── .gitignore                 (frontend/-prefixed ignores plus backend/.venv and backend/output)
├── CLAUDE.md                  (repo instructions for Claude Code; npm commands run inside frontend/)
├── docker-compose.yml         (production: frontend nginx service, host port 3000)
├── docker-compose.dev.yml     (dev: frontend vite dev server with bind-mounted source)
├── exhibition.sh              (builds & starts docker-compose.yml, prints the frontend URL)
├── build.ps1                  (one-command desktop build: npm run build → mirror dist/ → PyInstaller)
├── backend/                   (THE PYTHON HOST: game window + admin panel)
│   ├── main.py                (wiring: GameStore, admin server thread, pywebview window, CLI flags)
│   ├── store.py               (GameStore — the on-disk records, derived statistics, CSV, SSE pub/sub)
│   ├── admin_server.py        (stdlib ThreadingHTTPServer on 0.0.0.0:8239 — page, JSON API, SSE, CSV)
│   ├── admin/
│   │   └── index.html         (the admin dashboard — one self-contained file, no build step, no CDN)
│   ├── pyproject.toml         (pywebview + pyinstaller; Python >=3.12)
│   ├── uv.lock                (uv lockfile)
│   ├── .venv/                 (local virtualenv — git-ignored)
│   ├── frontend/              (copy of the built frontend the webview renders; re-sync from dist/)
│   └── output/                (runtime export files = the admin panel's database — git-ignored)
└── frontend/                  (THE REACT APP)
    ├── Dockerfile             (node:22 build stage → nginx serving dist/)
    ├── Dockerfile.dev         (vite dev server on port 3000)
    ├── nginx.conf             (SPA fallback; serves the Vite build)
    ├── README.md              (human-facing app README)
    ├── ai-docs/               (this documentation package)
    ├── flow/                  (organizer's .docx files — git-ignored, not part of the app)
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── public/
    │   ├── App.png            (design reference image — not used by the app)
    │   ├── BYekan+.ttf
    │   ├── favicon.svg
    │   └── fonts/
    │       ├── IranYekanXVF/  (IRANYekanX family + Farsi-numeral faces)
    │       └── Vazirmatn/     (bundled body font, weights 400–700)
    └── src/
        ├── app/
        │   ├── App.tsx
        │   ├── AppSession.tsx
        │   ├── designScale.ts
        │   └── routes.tsx
        ├── components/
        │   ├── Confetti.tsx
        │   ├── VirtualNumericKeyboard.tsx
        │   └── ui/
        │       ├── ChoiceGrid.tsx
        │       ├── FloatingDecorations.tsx
        │       ├── GameHeader.tsx
        │       ├── GradientText.tsx
        │       ├── Keypad.tsx
        │       ├── LeaderboardPanel.tsx
        │       ├── LiveBadge.tsx
        │       ├── NavButtons.tsx
        │       ├── PageShell.tsx
        │       ├── PhoneDisplay.tsx
        │       ├── StatsPanel.tsx
        │       └── StepTracker.tsx
        ├── config/
        │   └── appConfig.ts
        ├── domain/
        │   ├── category.ts
        │   ├── game.ts
        │   ├── gameResult.ts
        │   ├── survey.ts
        │   └── user.ts
        ├── games/
        │   ├── Game.ts
        │   ├── registry.ts
        │   └── number-wheel/
        │       ├── NumberWheelGame.tsx
        │       ├── assist.ts
        │       ├── config.ts
        │       ├── difficulty.ts
        │       ├── gameEngine.ts
        │       ├── number-wheel.css
        │       ├── prizeCalculator.ts
        │       ├── types.ts
        │       ├── useNumberGame.ts
        │       └── components/
        │           ├── NumberWheel.tsx
        │           └── WheelGroup.tsx
        ├── hooks/
        │   └── usePrefersReducedMotion.ts
        ├── pages/
        │   ├── CategorySelectionPage.tsx
        │   ├── GamePage.tsx
        │   ├── RegistrationPage.tsx
        │   └── SurveyPage.tsx
        ├── services/
        │   ├── index.ts
        │   ├── gameExporter.ts
        │   ├── leaderboard.ts
        │   ├── localResultRepository.ts
        │   ├── resultRepository.ts
        │   └── stats.ts
        ├── styles/
        │   ├── app.css
        │   ├── design-system.css
        │   ├── design-tokens.css
        │   └── global.css
        ├── utils/
        │   └── persian.ts
        ├── main.tsx
        └── vite-env.d.ts
```

Generated/git-ignored (not shown): `frontend/dist/`, `frontend/node_modules/`,
`frontend/tsconfig.*.tsbuildinfo`.

There are NO directories named `tests`, `scripts`, `types`, `store`, `state`, `context`, `features`,
`lib`, `assets`, or `api` (in `frontend/src/` or at the repo root).

## Directory Responsibilities

| Path | Type | Responsibility | Notes |
|---|---|---|---|
| `src/app/` | app code | Root component, session store, phase→page table | `AppSession.tsx` is the only Context provider in the repo |
| `src/pages/` | app code | One component per `AppPhase`; the only layer allowed to touch both the session and services | Pages are not routed by URL |
| `src/components/` | app code | Shared platform UI primitives usable by pages and games | Currently `Confetti`, `VirtualNumericKeyboard` (retained, unused) |
| `src/components/ui/` | app code | The redesigned visual language's shared components (page shell, tracker, keypad, panels, page-2 header/choices/nav) | Used by the redesigned pages (registration + survey); documented in `design-system.md` |
| `src/domain/` | app code | Pure types + pure helpers. No React, no DOM, no side effects | The contract layer everything else agrees on |
| `src/services/` | app code | Persistence boundary + pure leaderboard builder + the host export bridge | `index.ts` is the implementation selector |
| `<repo-root>/backend/` | host | Python host for the kiosk: a pywebview desktop shell rendering the build in `backend/frontend`, plus the admin dashboard's HTTP server on `localhost:8239`. Exposes `window.pywebview.api.export_game_result` (verbatim method names — no camelCase), owns all export-file writes, and logs to the console + `backend/pywebview.log` | `backend/output` is created at runtime; `backend/frontend` must be re-synced from `dist/` after each rebuild |
| `<repo-root>/backend/admin/` | host | The admin dashboard page, served by `admin_server.py` | One self-contained HTML file — no build step, no CDN, and no contact with the React app |
| `src/games/` | game code | Registry types + registry + one subdirectory per pluggable game | `Game.ts` holds `GameDefinition` (platform side of the contract) |
| `src/games/number-wheel/` | game code | The entire active minigame: shell, engine, tuning, components, stylesheet | Self-contained; must not import pages/services/session |
| `src/games/number-wheel/components/` | game code | Presentational + animation components local to this game | `NumberWheel.tsx` writes to the DOM directly |
| `src/hooks/` | app code | Shared platform hooks | Currently only `usePrefersReducedMotion` |
| `src/config/` | config (source) | Organizer-tunable platform settings | Editable, but it is source code — treat edits as code changes |
| `src/utils/` | app code | Pure display helpers | Currently only Persian numeral formatting |
| `src/styles/` | styles | `global.css` (font, tokens, reset) + `app.css` (platform components) + `design-tokens.css`/`design-system.css` (the redesign) | Imported once, in `src/main.tsx` |
| `public/` | assets | Files copied verbatim to the build root | Fonts + `favicon.svg` + the brand logos `smartis_logo.svg` (page header) and `almas_logo.svg` (page footer); `stores/` holds the category sponsor logos |
| `ai-docs/` | docs | AI-owned documentation (this package) | Lives inside `frontend/`. AI agents MUST keep it current |
| `<repo-root>/docker-compose*.yml`, `<repo-root>/exhibition.sh`, `<repo-root>/.dockerignore`, `frontend/Dockerfile*`, `frontend/nginx.conf` | deploy scaffold | Docker build/run arrangement for the single `frontend/` service | See `09_BUILD_RUN_DEPLOY.md` |
| `.claude/` | tooling | Claude Code local permission settings | Not application code |
| `dist/` | generated | Vite build output (under `frontend/`) | Git-ignored. Do not read or edit. |
| `node_modules/` | generated | Dependencies (under `frontend/`) | Git-ignored. Do not read or edit. |

## Generated / Ignored — Do Not Read Or Edit

From `<repo-root>/.gitignore` (frontend/-prefixed after the move): `frontend/node_modules`,
`frontend/dist`, `frontend/*.local`, `frontend/*.tsbuildinfo`, `frontend/.*.cjs`, `frontend/flow`,
plus `backend/.venv`, `backend/output`, and `backend/pywebview.log` (runtime artifacts of the
pywebview wrapper).

- `frontend/dist/` — Vite output; present in the working tree.
- `frontend/node_modules/` — dependency tree.
- `frontend/tsconfig.app.tsbuildinfo`, `frontend/tsconfig.node.tsbuildinfo` — TypeScript incremental
  build state.
- `frontend/flow/` — the organizer's `.docx` request/content files; git-ignored, not part of the app.
- `backend/.venv/` — the host's local virtualenv.
- `backend/output/` — runtime export files (`game_data_*.json`), created automatically by
  `backend/store.py`. These files are the system of record for the admin panel: deleting them
  deletes the dashboard's history.
- `backend/pywebview.log` — the host's runtime log (export requests, written files, admin server
  startup and failures).

## Important Files

| Path | Purpose |
|---|---|
| `frontend/index.html` | Vite HTML entry. `lang="fa" dir="rtl"`, `#root` mount node, `theme-color` `#0a0e17`, viewport locked (`maximum-scale=1.0, user-scalable=no, viewport-fit=cover`), favicon `/favicon.svg`, module script `/src/main.tsx`. |
| `frontend/package.json` | Name `smartis-game`, `private: true`, `version: 1.0.0`, `type: module`. Scripts: `dev`, `build`, `preview`. |
| `frontend/package-lock.json` | npm lockfile — the reason npm is the package manager. |
| `frontend/vite.config.ts` | `defineConfig({ plugins: [react()], server: { host: true }, base: "./" })`. `base: "./"` makes all asset URLs relative so the build loads from `backend/frontend` over `file://`. No aliases, no proxy, no custom `build` options. |
| `<repo-root>/backend/main.py` | Host wiring: builds the `GameStore`, starts the admin server thread, opens the pywebview window with `js_api=Api(store)`. `Api.export_game_result(data)` (exposed to JS as `window.pywebview.api.export_game_result` — verbatim names, no camelCase) delegates to the store. Logs to the console + `backend/pywebview.log`, including a startup self-check of the exposed JS API methods. Flags: `--no-window`, `--no-admin`, `--host`, `--port`. |
| `<repo-root>/backend/store.py` | `GameStore`: the on-disk records are the database. Scans every `game_data_<date>_NNN.json` at startup, writes new iterations (exclusive create + atomic daily rebuild) under a `threading.RLock`, derives every dashboard statistic, generates the CSV, and broadcasts each new record to SSE subscribers. `PRIZE_POOL_TOTAL = 100_000_000` must match the game's `BUDGET`. |
| `<repo-root>/backend/admin_server.py` | Stdlib `ThreadingHTTPServer` on `0.0.0.0:8239` (LAN-reachable, no auth): `GET /` (page), `/api/state`, `/api/events` (SSE), `/api/export.csv`, `POST /api/results`, `OPTIONS`. A bind failure is logged and swallowed — the game runs regardless. |
| `<repo-root>/backend/admin/index.html` | The dashboard: summary cards, prize-pool bar, win distribution, category table, player table (sort/search/filter/pagination), CSV button. Vanilla JS + `EventSource`, one file, no dependency. |
| `<repo-root>/backend/pyproject.toml` | Python >=3.12; dependencies `pywebview>=6.2.1` and `pyinstaller>=6.22.2`. The store, HTTP server, and dashboard add **no** dependency — all stdlib. |
| `<repo-root>/build.ps1` | One-command desktop build: `npm run build` → wipe-and-mirror `frontend/dist` into `backend/frontend` → PyInstaller onedir with `--add-data "frontend;frontend" --add-data "admin;admin"`. Preserves a previous build's `output/`. Must stay pure ASCII. |
| `frontend/tsconfig.json` | Solution file: `files: []`, references `tsconfig.app.json` and `tsconfig.node.json`. |
| `frontend/tsconfig.app.json` | Rules for `src`. `target: ES2022`, `lib: [ES2022, DOM, DOM.Iterable]`, `jsx: react-jsx`, `moduleResolution: bundler`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `noUncheckedSideEffectImports`, `noEmit`. |
| `frontend/tsconfig.node.json` | Rules for `vite.config.ts` only. `target: ES2023`, `lib: [ES2023]` (no DOM). |
| `frontend/README.md` | Human-facing overview (app + Python backend). Human-owned — modify only on explicit user request. |
| `<repo-root>/CLAUDE.md` | Repo instructions for Claude Code (frontend npm commands + backend run/sync steps). Human-owned — get approval before changing it. |
| `<repo-root>/.gitignore` | See list above. |
| `<repo-root>/docker-compose.yml` | Production: builds `./frontend` (nginx image serving the Vite build), host port 3000 → container 80. |
| `<repo-root>/docker-compose.dev.yml` | Dev: builds `./frontend` with `Dockerfile.dev` (vite dev server, port 3000), bind-mounted source + anonymous `node_modules` volume. |
| `<repo-root>/exhibition.sh` | Runs `docker-compose -f docker-compose.yml up -d --build`, prints `docker-compose ps` and the frontend URL. |
| `frontend/nginx.conf` | SPA fallback (`try_files … /index.html`) serving `/usr/share/nginx/html` (the Vite build). Used by the frontend Dockerfile. |

## Absent Configuration (verified: these files do not exist)

`eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `postcss.config.*`, `tailwind.config.*`,
`babel.config.*`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`,
`.env`, `.env.example`, `.env.local.example`, `.github/`, `vercel.json`, `netlify.toml`,
`next.config.*`, `jsconfig.json`.

(Present, unlike a default Vite scaffold: `frontend/Dockerfile`, `frontend/Dockerfile.dev`,
`frontend/nginx.conf`, root `docker-compose.yml` / `docker-compose.dev.yml` / `exhibition.sh` /
`.dockerignore`.)

## Working-Tree vs Git HEAD

`git ls-files` tracks **no** files at the old root paths (`src/…`, `public/…`, `ai-docs/…`) — every
source file lives under `frontend/`. The root-level deploy files are untracked (not yet committed):
`.dockerignore`, `docker-compose.yml`, `docker-compose.dev.yml`, `exhibition.sh`,
`frontend/Dockerfile`, `frontend/Dockerfile.dev`, `frontend/nginx.conf`. The entire `backend/`
directory (pywebview wrapper) is also untracked.

**The current state of the project is the working tree: only `number-wheel` exists.** No source file
references `ten-second`. `frontend/src/games/registry.ts` registers exactly one game. One stale
single-game artifact remains in the code — see `12_KNOWN_GAPS_AND_RISKS.md` (`index.html` `<title>`).
