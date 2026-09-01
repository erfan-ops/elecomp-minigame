# DOC_ID: AI-09_BUILD_RUN_DEPLOY
# SCOPE: Package manager, scripts, toolchain, environment variables, build output, deployment
# STATUS: PARTIAL
# PRIMARY_SOURCE_PATHS:
# - package.json
# - package-lock.json
# - vite.config.ts
# - tsconfig.json
# - tsconfig.app.json
# - tsconfig.node.json
# - .gitignore
# - index.html
# - README.md
# - CLAUDE.md
# - <repo-root>/backend/main.py
# - <repo-root>/backend/pyproject.toml

`STATUS: PARTIAL` because which runtime arrangement the kiosk boots on exhibition day (Docker nginx
vs. the pywebview wrapper) and whether any launch automation exists are not discoverable from the
repository (`UNKNOWN`). Everything else in this document is `VERIFIED`.

## Package Manager

**npm.** Evidence: `package-lock.json` at the app root, `frontend/` (lockfileVersion 3 format). There is
no `yarn.lock`, no `pnpm-lock.yaml`, no `bun.lockb`, and no `packageManager` field in `package.json`.

## Package Metadata

| Field | Value |
|---|---|
| `name` | `smartis-game` |
| `private` | `true` (never published to a registry) |
| `version` | `1.0.0` |
| `type` | `module` (all `.ts`/`.js` files are ESM; `.cjs` is required for CommonJS scripts) |
| `description` | `Touch-first three-wheel number game for conference kiosks` |
| `engines` | **absent** — the repository declares no Node version constraint |

## Dependencies

Runtime (`dependencies`):

| Package | Range | Resolved in lockfile |
|---|---|---|
| `react` | `^19.1.0` | `19.2.8` |
| `react-dom` | `^19.1.0` | `19.2.8` |

Development (`devDependencies`):

| Package | Range | Resolved in lockfile |
|---|---|---|
| `@types/react` | `^19.1.8` | — |
| `@types/react-dom` | `^19.1.6` | — |
| `@vitejs/plugin-react` | `^5.0.0` | `5.2.0` |
| `typescript` | `~5.8.3` | `5.8.3` |
| `vite` | `^7.0.0` | `7.3.6` |

There are **no** other runtime dependencies: no router, no state library, no HTTP client, no date
library, no CSS framework, no test framework, no linter, no formatter.

## Node.js Version

Not declared by this project. Vite `7.3.6` declares
`engines.node: "^20.19.0 || >=22.12.0"` in `package-lock.json`, so that is the effective floor for
running the tooling. The application itself is browser-only and requires no Node at runtime.

## Commands

All commands run inside `frontend/` (the app root).

| Purpose | Command | Definition | Notes |
|---|---|---|---|
| Install | `npm install` | — | Uses `package-lock.json` |
| Clean install | `npm ci` | — | Not documented in `README.md`, but valid given the lockfile |
| Dev server | `npm run dev` | `vite` | Binds all interfaces (`server.host: true`) so the kiosk device on the LAN can reach it. Default port `5173` (Vite default; not configured) |
| Production build | `npm run build` | `tsc -b && vite build` | **The only automated quality gate.** Type-check runs first and aborts the build on error |
| Preview build | `npm run preview` | `vite preview` | Serves `dist/` locally |
| Tests | **none** | — | No test script, no test framework, no test files |
| Lint | **none** | — | No ESLint config or dependency |
| Format | **none** | — | No Prettier config or dependency |
| Type-check only | **no dedicated script** | run `npx tsc -b` | Equivalent to the first half of `npm run build` |

### Type-Check Gate Status

`tsc -b` has been executed against the current working tree and **passes with zero errors**
(`VERIFIED`). `tsconfig.app.json` sets `noEmit: true`, so the type-check produces no JavaScript — Vite
performs the actual transformation.

## TypeScript Configuration

Solution-style project references. `tsconfig.json` has `files: []` and references two configs:

| Config | Covers | Key settings |
|---|---|---|
| `tsconfig.app.json` | `include: ["src"]` | `target: ES2022`, `lib: [ES2022, DOM, DOM.Iterable]`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `moduleDetection: force`, `useDefineForClassFields`, `skipLibCheck`, `noEmit` |
| `tsconfig.node.json` | `include: ["vite.config.ts"]` | `target: ES2023`, `lib: [ES2023]` (**no DOM**), same lint-style flags, `noEmit` |

Consequences an agent must respect:

- `verbatimModuleSyntax` ⇒ type-only imports MUST use `import type { … }`.
- `noUnusedLocals` / `noUnusedParameters` ⇒ any unused local or parameter **fails the build**.
- `noEmit` ⇒ `tsc` is a checker only; never expect JS output from it.
- `tsconfig.node.json` has no DOM lib ⇒ `vite.config.ts` MUST NOT reference DOM globals.
- Incremental build state lives in `tsconfig.app.tsbuildinfo` / `tsconfig.node.tsbuildinfo`
  (git-ignored).

## Vite Configuration

`vite.config.ts` — complete contents in substance:

```ts
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  base: "./",
});
```

`base: "./"` makes every asset URL relative, so the build also loads from `backend/frontend` over
`file://` inside the pywebview wrapper.

Not configured (Vite defaults apply): `build.outDir` (`dist`), `build.target`,
`build.sourcemap` (off), `resolve.alias` (**no path aliases — all imports are relative**),
`server.port` (`5173`), `server.proxy` (none), `preview.port` (`4173`), `define`, `envPrefix`.

CSS is handled by Vite's built-in pipeline (Vite bundles `postcss` internally). There is **no**
project-level PostCSS or autoprefixer configuration.

## Environment Variables

**None.** Verified: no `import.meta.env` reference and no `process.env` reference anywhere in `src/`,
and no `.env`, `.env.example`, `.env.local`, or `.env.production` file exists in the repository.

- The application requires **zero** environment configuration to build or run.
- No API keys, tokens, secrets, or private URLs exist in the repository or are needed.
- All tunable values are TypeScript constants in `src/config/appConfig.ts` and
  `src/games/number-wheel/config.ts`. Changing them is a **source-code change** requiring a rebuild —
  there is no runtime configuration mechanism.
- The Docker files, `exhibition.sh`, and the pywebview backend (`backend/main.py`) set no environment
  variables for the app (the `REACT_APP_*` entries that existed for the removed FastAPI backend are
  gone — Vite would ignore them anyway).

If environment variables are ever introduced, Vite requires the `VITE_` prefix for them to be exposed to
client code, and any such value would be **embedded in the public bundle** — it MUST NOT be a secret.

## Required External Services

**None hosted remotely.** Verified: no `XMLHttpRequest`, `axios`, `WebSocket`, or
`navigator.sendBeacon` call anywhere in `src/`. There is no database, no auth provider, no analytics, no
error-reporting service, and no CDN dependency (the font is bundled in `public/`). The single `fetch`
call in `src/` targets `localhost` (below).

**Optional host bridge:** when the built app runs inside the Python host
(`<repo-root>/backend/main.py`, dependency `pywebview>=6.2.1`), the host exposes
`window.pywebview.api.export_game_result` (the Python method's verbatim name — pywebview 6 does no
camelCase conversion), through which each completed game iteration is written to
`backend/output` as JSON (see `06_STATE_AND_DATA_FLOW.md`). That is an in-process function call, not a
network request. When it is unavailable the exporter falls back to a fire-and-forget
`POST http://localhost:8239/api/results` — the admin panel's ingest endpoint on the same machine,
never a remote service. The host logs requests, written file paths, and failures to the console and to
`backend/pywebview.log`, and logs the exposed JS API method list once at startup. With neither
transport reachable the export silently no-ops — the app runs fully without it.

The only persistence is the browser's own `localStorage` (key `smartis-game.results.v1`). Consequences:

- Results are stored **per browser profile, per device**. Two kiosks do not share a leaderboard.
- Clearing browser data erases all results.
- The kiosk browser MUST NOT run in a mode that clears storage between sessions, or the leaderboard and
  the anti-replay check will be empty on every launch.

## Build Output

| Aspect | Value |
|---|---|
| Output directory | `dist/` (Vite default; git-ignored) |
| Contents | `index.html`, hashed JS/CSS under `dist/assets/`, and everything from `public/` copied verbatim (`BYekan+.ttf`, `favicon.svg`) |
| Base path | `./` (relative asset URLs, set in `vite.config.ts`) — the build is relocatable and loads from `backend/frontend` over `file://` as well as from a web server |
| Type | Fully static. No server runtime, no SSR, no serverless functions, no API routes |
| Source maps | Not enabled |
| Code splitting | The active game is statically imported by `src/games/registry.ts`, so it is in the main chunk. There is no `React.lazy` or dynamic `import()` anywhere |

## Deployment

There is no CI. Two runtime arrangements exist in the repo:

**Docker (nginx):**

- `docker-compose.yml` — one service: `frontend` (nginx image serving the Vite build), host port
  3000 → container 80, `restart: unless-stopped`.
- `docker-compose.dev.yml` — `frontend` via `Dockerfile.dev` (vite dev server, port 3000 in-container)
  with bind-mounted source and an anonymous `/app/node_modules` volume.
- `frontend/Dockerfile` — node:22 build stage (`npm ci && npm run build`), then nginx serving
  `/usr/share/nginx/html` (the build output) with `frontend/nginx.conf` (SPA fallback only).
- `exhibition.sh` — runs `docker-compose -f docker-compose.yml up -d --build`, prints
  `docker-compose ps` and the frontend URL.

Under this arrangement the app runs in a plain browser, so the pywebview bridge is absent. The
on-disk export then falls back to `POST http://localhost:8239/api/results`, which lands only if the
Python host is running on the same machine; otherwise it silently no-ops and localStorage remains the
only persistence.

**Python host (`backend/`):**

1. Build the frontend (`npm run build`).
2. Copy the build into `backend/frontend/` (replace `index.html` and `assets/`; stale hashed bundles
   should be removed — the directory is a mirror of `dist/`).
3. Run `backend/main.py` with its venv (`uv` lockfile + `pyproject.toml`; dependencies `pywebview`,
   `pyinstaller`). It opens a fullscreen `webview` window rendering `backend/frontend/index.html`
   with `js_api=Api(store)` — completed game iterations are exported to `backend/output` (directory
   created automatically) — **and** starts the admin dashboard on `http://localhost:8239` (bound to
   `0.0.0.0`, so other machines on the same LAN can open `http://<kiosk-ip>:8239`).

```bash
cd backend
uv sync                                    # first time
.venv/Scripts/python.exe main.py           # game window + admin panel
.venv/Scripts/python.exe main.py --no-window   # admin panel only (monitoring/verification)
.venv/Scripts/python.exe main.py --no-admin    # game window only
.venv/Scripts/python.exe main.py --port 9000   # move the admin panel off 8239
```

The packaged `smartis-game.exe` accepts the same flags. Both the window and the panel share one
process and one `GameStore`, which is what makes the dashboard update live without polling; the
dashboard's data is read back from `backend/output`, so restarting either side loses nothing. If the
port is already taken the panel is skipped with a logged error and the game runs normally
(`13_ADMIN_PANEL.md`).

**Packaging (`<repo-root>/build.ps1`):** one command does the whole chain — `npm run build`,
wipe-and-mirror `frontend/dist` into `backend/frontend`, then PyInstaller onedir
(`-y -D -w -n smartis-game --add-data "frontend;frontend" --add-data "admin;admin"`), producing
`backend/dist/smartis-game/smartis-game.exe`. Onedir rather than onefile because `output/` must
outlive the process; the script moves an existing `output/` aside and back, because `-y` would delete
it. Both `--add-data` payloads are required: the frontend for the window, `admin` for the dashboard
page. The file must stay pure ASCII (Windows PowerShell 5.1 decodes `.ps1` as the system ANSI
codepage, and a UTF-8 em dash then terminates a string early).

What IS documented (`README.md` → "Kiosk mode"), i.e. how the app is intended to be *run*, not hosted:

- Windows / Chrome: `chrome.exe --kiosk --fullscreen --disable-pinch <url>`
- Or press `F11` in any browser.

`INFERRED` from the build characteristics: `dist/` can be served by any static file host or local static
server. Any host must serve `index.html` for the root path; because there is no client-side router and no
deep linking, **no SPA rewrite rule is required**.

`UNKNOWN`: which arrangement the kiosk actually boots on exhibition day, and whether the
`backend/frontend` sync step is automated anywhere (no script performs it in the repo).

## CI / CD

**None.** No CI configuration files, no git hooks directory in the repository, no `husky`,
`lint-staged`, or `simple-git-hooks` dependency. Quality gating is manual: a developer or agent runs
`npm run build`.

## Verification Workflow (project convention)

There is no test framework. `CLAUDE.md` documents the established manual/automated verification approach
for behavioral checks:

1. Start the dev server (`npm run dev`).
2. Place a temporary iframe harness page in `public/` that drives the real app via `.click()` and writes
   results into a `<pre>`.
3. Drive headless Chrome over the DevTools Protocol (Node's built-in `WebSocket` +
   `fetch("http://127.0.0.1:<port>/json/new?<url>", { method: "PUT" })`) to capture DOM, console errors,
   and exceptions.
4. Run under **real time**. `--virtual-time-budget` freezes CSS transitions, so it is usable only for
   logic/flow checks, never for computed styles.
5. **Delete the harness afterwards** so it does not ship in `dist/`.

Critical gotcha (from `CLAUDE.md`): React 18+ flushes state updates in a microtask, so synthetic
`.click()` calls in a tight loop all observe the same stale state. Insert ~30 ms gaps between synthetic
clicks. Real touch events are separate tasks and do not hit this.

## Ports Used

| Port | Purpose | Configured where |
|---|---|---|
| `5173` | Vite dev server | Vite default (not set in `vite.config.ts`; the dev Dockerfile pins `3000` via `--port 3000`) |
| `4173` | `vite preview` | Vite default (not set) |
| `9222` / `9234` | Chrome remote-debugging during verification only | `CLAUDE.md` documents `9222`; past harness drivers used `9234` / `9333` |
| `3000` | Docker: frontend nginx (production compose) and the vite dev server (dev compose / `Dockerfile.dev`) | `docker-compose*.yml` `ports:` |
| `8239` | The admin dashboard (page + JSON API + SSE + CSV), bound to `0.0.0.0` by default (LAN-reachable, **no authentication**; `--host 127.0.0.1` restores loopback only) | `DEFAULT_PORT` / `DEFAULT_HOST` in `<repo-root>/backend/admin_server.py`; overridable with `--port` / `--host`. The frontend's fallback POST target is `ADMIN_INGEST_URL` in `src/services/gameExporter.ts` — change both together |

## Secrets

There are no secrets in this repository. `.claude/settings.local.json` contains only Claude Code
permission allow-list entries. No credential, token, key, or private URL is present, and none is required
to build, run, or deploy the application.
