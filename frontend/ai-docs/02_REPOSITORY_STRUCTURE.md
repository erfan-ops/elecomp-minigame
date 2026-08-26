# DOC_ID: AI-02_REPOSITORY_STRUCTURE
# SCOPE: Directory and root-file map
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - (filesystem walk of the working tree)
# - .gitignore
# - package.json
# - tsconfig.json

## Top-Level Tree (working tree, excluding generated/dependency dirs)

The repository root became a multi-part layout on 2026-08-26 (commit `8169d35` "moved frontend
stuff"): the React app and **all of its supporting files** — including this `ai-docs/` package — live
under `frontend/`. **Every path in this documentation package is relative to `frontend/`** unless the
`<repo-root>/` prefix is written explicitly.

```
<repo-root>/
├── .claude/
│   └── settings.local.json
├── .dockerignore              (docker build ignores: node_modules, dist, logs, .git, .env)
├── .gitignore                 (frontend/-prefixed ignores only — see "Generated / Ignored")
├── CLAUDE.md                  (repo instructions for Claude Code; npm commands run inside frontend/)
├── backend/                   (FastAPI service scaffold — Dockerfile only, no application code yet)
├── panel/                     (admin-panel scaffold — Dockerfile, Dockerfile.dev, nginx.conf only,
│                               no application code yet)
├── docker-compose.yml         (backend + frontend + frontend-panel(build: ./panel) + postgres + redis)
├── docker-compose.dev.yml     (backend --reload + frontend/panel vite dev servers on 3000/3001)
├── exhibition.sh              (exports API URLs, builds & starts docker-compose.yml, prints the URLs)
└── frontend/                  (THE REACT APP — the old repo root)
    ├── Dockerfile             (node:22 build stage → nginx serving dist/)
    ├── Dockerfile.dev         (vite dev server on port 3000)
    ├── nginx.conf             (SPA fallback + /api/ and /ws/ proxy to backend:8000)
    ├── README.md              (human-facing app README — moved with the app)
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
        │       ├── config.ts
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
        │   ├── leaderboard.ts
        │   ├── localResultRepository.ts
        │   └── resultRepository.ts
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
| `src/services/` | app code | Persistence boundary + pure leaderboard builder | `index.ts` is the implementation selector |
| `src/games/` | game code | Registry types + registry + one subdirectory per pluggable game | `Game.ts` holds `GameDefinition` (platform side of the contract) |
| `src/games/number-wheel/` | game code | The entire active minigame: shell, engine, tuning, components, stylesheet | Self-contained; must not import pages/services/session |
| `src/games/number-wheel/components/` | game code | Presentational + animation components local to this game | `NumberWheel.tsx` writes to the DOM directly |
| `src/hooks/` | app code | Shared platform hooks | Currently only `usePrefersReducedMotion` |
| `src/config/` | config (source) | Organizer-tunable platform settings | Editable, but it is source code — treat edits as code changes |
| `src/utils/` | app code | Pure display helpers | Currently only Persian numeral formatting |
| `src/styles/` | styles | `global.css` (font, tokens, reset) + `app.css` (platform components) + `design-tokens.css`/`design-system.css` (the redesign) | Imported once, in `src/main.tsx` |
| `public/` | assets | Files copied verbatim to the build root | Fonts + `favicon.svg` (`Container.svg` deleted 2026-08-26 — the shell logo is the text `GameHeader`) |
| `ai-docs/` | docs | AI-owned documentation (this package) | Lives inside `frontend/`. AI agents MUST keep it current |
| `<repo-root>/backend/` | scaffold | FastAPI service intended to back the app | Dockerfile only; no application code yet. Compose wires it to port 8000 + postgres/redis |
| `<repo-root>/panel/` | scaffold | Admin panel intended for organizers | Dockerfile + Dockerfile.dev + nginx.conf only; no application code yet |
| `<repo-root>/docker-compose*.yml`, `exhibition.sh`, `.dockerignore`, `frontend/Dockerfile*`, `frontend/nginx.conf`, `panel/nginx.conf` | deploy scaffold | Docker build/run arrangement added 2026-08-26 | See `09_BUILD_RUN_DEPLOY.md` |
| `.claude/` | tooling | Claude Code local permission settings | Not application code |
| `dist/` | generated | Vite build output (under `frontend/`) | Git-ignored. Do not read or edit. |
| `node_modules/` | generated | Dependencies (under `frontend/`) | Git-ignored. Do not read or edit. |

## Generated / Ignored — Do Not Read Or Edit

From `<repo-root>/.gitignore` (frontend/-prefixed after the move): `frontend/node_modules`,
`frontend/dist`, `frontend/*.local`, `frontend/*.tsbuildinfo`, `frontend/.*.cjs`, `frontend/flow`.

- `frontend/dist/` — Vite output; present in the working tree.
- `frontend/node_modules/` — dependency tree.
- `frontend/tsconfig.app.tsbuildinfo`, `frontend/tsconfig.node.tsbuildinfo` — TypeScript incremental
  build state.
- `frontend/flow/` — the organizer's `.docx` request/content files; git-ignored, not part of the app.

## Important Files

| Path | Purpose |
|---|---|
| `frontend/index.html` | Vite HTML entry. `lang="fa" dir="rtl"`, `#root` mount node, `theme-color` `#0a0e17`, viewport locked (`maximum-scale=1.0, user-scalable=no, viewport-fit=cover`), favicon `/favicon.svg`, module script `/src/main.tsx`. |
| `frontend/package.json` | Name `smartis-game`, `private: true`, `version: 1.0.0`, `type: module`. Scripts: `dev`, `build`, `preview`. |
| `frontend/package-lock.json` | npm lockfile — the reason npm is the package manager. |
| `frontend/vite.config.ts` | `defineConfig({ plugins: [react()], server: { host: true } })`. Nothing else is configured — no aliases, no proxy, no custom `base` or `build` options. |
| `frontend/tsconfig.json` | Solution file: `files: []`, references `tsconfig.app.json` and `tsconfig.node.json`. |
| `frontend/tsconfig.app.json` | Rules for `src`. `target: ES2022`, `lib: [ES2022, DOM, DOM.Iterable]`, `jsx: react-jsx`, `moduleResolution: bundler`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `noUncheckedSideEffectImports`, `noEmit`. |
| `frontend/tsconfig.node.json` | Rules for `vite.config.ts` only. `target: ES2023`, `lib: [ES2023]` (no DOM). |
| `frontend/README.md` | Human-facing overview. DO NOT MODIFY. |
| `<repo-root>/CLAUDE.md` | Repo instructions for Claude Code (npm commands run inside `frontend/`). The user's checked-in file — get approval before changing it. |
| `<repo-root>/.gitignore` | See list above. |
| `<repo-root>/docker-compose.yml` | Production scaffold: backend (:8000), frontend nginx (:3000), panel nginx (:3001), postgres, redis. |
| `<repo-root>/docker-compose.dev.yml` | Dev scaffold: backend `uvicorn --reload`, frontend/panel vite dev servers with bind-mounted source. |
| `<repo-root>/exhibition.sh` | Exports API URLs, runs `docker-compose -f docker-compose.yml up -d --build`, prints the three service URLs. |
| `frontend/nginx.conf` | SPA fallback (`try_files … /index.html`) + `/api/` and `/ws/` proxy to `backend:8000`. Used by the frontend Dockerfile. |

## Absent Configuration (verified: these files do not exist)

`eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `postcss.config.*`, `tailwind.config.*`,
`babel.config.*`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`,
`.env`, `.env.example`, `.env.local.example`, `.github/`, `vercel.json`, `netlify.toml`,
`next.config.*`, `jsconfig.json`.

(No longer absent since 2026-08-26: `Dockerfile`s in `frontend/`, `backend/`, `panel/`, plus
`docker-compose.yml`, `docker-compose.dev.yml`, `nginx.conf` files, `exhibition.sh`, `.dockerignore`.)

## Working-Tree vs Git HEAD

Commit `8169d35` ("moved frontend stuff") moved the entire app under `frontend/` and removed the
deleted `ten-second` game's files from git in the same commit: `git ls-files` tracks **no** files at
the old root paths (`src/…`, `public/…`, `ai-docs/…`) and **no** `ten-second` files.

Untracked at the repo root (new scaffolding, not yet committed): `.dockerignore`, `backend/`,
`panel/`, `docker-compose.yml`, `docker-compose.dev.yml`, `exhibition.sh`, `frontend/Dockerfile`,
`frontend/Dockerfile.dev`, `frontend/nginx.conf`.

**The current state of the project is the working tree: only `number-wheel` exists.** No source file
references `ten-second`. `frontend/src/games/registry.ts` registers exactly one game. One stale
single-game artifact remains in the code — see `12_KNOWN_GAPS_AND_RISKS.md` (`index.html` `<title>`).
