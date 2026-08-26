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

`STATUS: PARTIAL` because the deployment target and hosting/CI arrangement are not discoverable from the
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

All commands run inside `frontend/` (the app root since the 2026-08-26 move).

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
});
```

Not configured (Vite defaults apply): `base` (`/`), `build.outDir` (`dist`), `build.target`,
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
- The compose files and `exhibition.sh` set `REACT_APP_API_URL` / `REACT_APP_WS_URL` — those are
  CRA-style names that **Vite ignores** (no `VITE_` prefix, and nothing reads them). They are inert
  until the app gains an API client.

If environment variables are ever introduced, Vite requires the `VITE_` prefix for them to be exposed to
client code, and any such value would be **embedded in the public bundle** — it MUST NOT be a secret.

## Required External Services

**None.** Verified: no `fetch`, `XMLHttpRequest`, `axios`, `WebSocket`, `EventSource`, or
`navigator.sendBeacon` call anywhere in `src/`. There is no database, no auth provider, no analytics, no
error-reporting service, and no CDN dependency (the font is bundled in `public/`).

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
| Base path | `/` (absolute asset URLs). Serving from a sub-path REQUIRES setting `base` in `vite.config.ts` — the font is referenced as `/BYekan+.ttf` and would 404 otherwise |
| Type | Fully static. No server runtime, no SSR, no serverless functions, no API routes |
| Source maps | Not enabled |
| Code splitting | The active game is statically imported by `src/games/registry.ts`, so it is in the main chunk. There is no `React.lazy` or dynamic `import()` anywhere |

## Deployment

`UNKNOWN` (still) — there is no CI and no chosen host, but a **Docker scaffold** was added at the repo
root on 2026-08-26. It is scaffolding, not a working deployment:

- `docker-compose.yml` — services: `backend` (FastAPI, port 8000), `frontend` (nginx serving the Vite
  build on host port 3000), `frontend-panel` (builds `./panel`, host port 3001), `postgres:16-alpine`,
  `redis:7-alpine`. All on a `game-network` bridge.
- `docker-compose.dev.yml` — `backend` with `uvicorn --reload` and bind-mounted source; `frontend` and
  `frontend-panel` run the Vite dev server (`Dockerfile.dev`, port 3000 in-container) with bind-mounted
  source and an anonymous `/app/node_modules` volume.
- `frontend/Dockerfile` — node:22 build stage (`npm ci && npm run build`), then nginx serving
  `/app/dist` with `frontend/nginx.conf` (SPA fallback + `/api/` and `/ws/` proxy to `backend:8000`).
- `exhibition.sh` — exports the API URLs, runs `docker-compose up -d --build`, prints the service URLs.

**Caveat:** `backend/` and `panel/` contain Dockerfiles but **no application code** (no
`requirements.txt` / `package.json`), so `docker compose up` cannot build those services yet. The
frontend image itself builds.

What IS documented (`README.md` → "Kiosk mode"), i.e. how the app is intended to be *run*, not hosted:

- Windows / Chrome: `chrome.exe --kiosk --fullscreen --disable-pinch <url>`
- Or press `F11` in any browser.

`INFERRED` from the build characteristics: `dist/` can be served by any static file host or local static
server. Any host must serve `index.html` for the root path; because there is no client-side router and no
deep linking, **no SPA rewrite rule is required**.

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
| `3000` / `3001` / `8000` | Docker: frontend nginx / panel nginx / backend uvicorn | `docker-compose.yml` `ports:` |

## Secrets

There are no secrets in this repository. `.claude/settings.local.json` contains only Claude Code
permission allow-list entries. No credential, token, key, or private URL is present, and none is required
to build, run, or deploy the application.
