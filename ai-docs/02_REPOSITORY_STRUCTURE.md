# DOC_ID: AI-02_REPOSITORY_STRUCTURE
# SCOPE: Directory and root-file map
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - (filesystem walk of the working tree)
# - .gitignore
# - package.json
# - tsconfig.json

## Top-Level Tree (working tree, excluding generated/dependency dirs)

```
.
├── .claude/
│   └── settings.local.json
├── ai-docs/                  (this documentation package)
├── public/
│   ├── App.png               (design reference image — not used by the app)
│   ├── BYekan+.ttf
│   ├── Container.svg         (logo, shown on every redesigned page)
│   ├── favicon.svg
│   └── fonts/
│       └── IranYekanXVF/     (empty — the intended primary font is not present)
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── AppSession.tsx
│   │   ├── designScale.ts
│   │   └── routes.tsx
│   ├── components/
│   │   ├── Confetti.tsx
│   │   ├── VirtualNumericKeyboard.tsx
│   │   └── ui/
│   │       ├── ChoiceGrid.tsx
│   │       ├── FloatingDecorations.tsx
│   │       ├── GameHeader.tsx
│   │       ├── GradientText.tsx
│   │       ├── Keypad.tsx
│   │       ├── LeaderboardPanel.tsx
│   │       ├── LiveBadge.tsx
│   │       ├── NavButtons.tsx
│   │       ├── PageShell.tsx
│   │       ├── PhoneDisplay.tsx
│   │       └── StepTracker.tsx
│   ├── config/
│   │   └── appConfig.ts
│   ├── domain/
│   │   ├── category.ts
│   │   ├── game.ts
│   │   ├── gameResult.ts
│   │   ├── survey.ts
│   │   └── user.ts
│   ├── games/
│   │   ├── Game.ts
│   │   ├── registry.ts
│   │   └── number-wheel/
│   │       ├── NumberWheelGame.tsx
│   │       ├── config.ts
│   │       ├── gameEngine.ts
│   │       ├── number-wheel.css
│   │       ├── prizeCalculator.ts
│   │       ├── types.ts
│   │       ├── useNumberGame.ts
│   │       └── components/
│   │           ├── GameControls.tsx
│   │           ├── NumberWheel.tsx
│   │           ├── ResultDisplay.tsx
│   │           ├── TargetDisplay.tsx
│   │           └── WheelGroup.tsx
│   ├── hooks/
│   │   └── usePrefersReducedMotion.ts
│   ├── pages/
│   │   ├── CategorySelectionPage.tsx
│   │   ├── GamePage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   ├── RegistrationPage.tsx
│   │   └── SurveyPage.tsx
│   ├── services/
│   │   ├── index.ts
│   │   ├── leaderboard.ts
│   │   ├── localResultRepository.ts
│   │   └── resultRepository.ts
│   ├── styles/
│   │   ├── app.css
│   │   ├── design-system.css
│   │   ├── design-tokens.css
│   │   └── global.css
│   ├── utils/
│   │   └── persian.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── .cdp-retry.cjs            (git-ignored, untracked local dev artifact)
├── .gitignore
├── CLAUDE.md
├── README.md
├── dist/                     (generated build output — git-ignored)
├── index.html
├── node_modules/             (generated — git-ignored)
├── package-lock.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.app.tsbuildinfo  (generated — git-ignored)
├── tsconfig.node.tsbuildinfo (generated — git-ignored)
└── vite.config.ts
```

There are NO directories named `tests`, `scripts`, `types`, `store`, `state`, `context`, `features`,
`lib`, `assets`, or `api`.

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
| `public/` | assets | Files copied verbatim to the build root | Fonts + `favicon.svg` + `Container.svg` |
| `ai-docs/` | docs | AI-owned documentation (this package) | AI agents MUST keep it current |
| `.claude/` | tooling | Claude Code local permission settings | Not application code |
| `dist/` | generated | Vite build output | Git-ignored. Do not read or edit. |
| `node_modules/` | generated | Dependencies | Git-ignored. Do not read or edit. |

## Generated / Ignored — Do Not Read Or Edit

From `.gitignore`: `node_modules`, `dist`, `*.local`, `*.tsbuildinfo`, `.*.cjs`.

- `dist/` — Vite output; present in the working tree.
- `node_modules/` — dependency tree.
- `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo` — TypeScript incremental build state.
- `.cdp-retry.cjs` — untracked, git-ignored local CDP verification driver (headless Chrome over
  `--remote-debugging-port`, targeting `http://localhost:5173/`). Its own header comment says it is
  temporary and should be deleted after verification. It is NOT part of the application and MUST NOT be
  imported by source code.

## Important Root Files

| Path | Purpose |
|---|---|
| `index.html` | Vite HTML entry. `lang="fa" dir="rtl"`, `#root` mount node, `theme-color` `#0a0e17`, viewport locked (`maximum-scale=1.0, user-scalable=no, viewport-fit=cover`), favicon `/favicon.svg`, module script `/src/main.tsx`. |
| `package.json` | Name `smartis-game`, `private: true`, `version: 1.0.0`, `type: module`. Scripts: `dev`, `build`, `preview`. |
| `package-lock.json` | npm lockfile — the reason npm is the package manager. |
| `vite.config.ts` | `defineConfig({ plugins: [react()], server: { host: true } })`. Nothing else is configured — no aliases, no proxy, no custom `base` or `build` options. |
| `tsconfig.json` | Solution file: `files: []`, references `tsconfig.app.json` and `tsconfig.node.json`. |
| `tsconfig.app.json` | Rules for `src`. `target: ES2022`, `lib: [ES2022, DOM, DOM.Iterable]`, `jsx: react-jsx`, `moduleResolution: bundler`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `noUncheckedSideEffectImports`, `noEmit`. |
| `tsconfig.node.json` | Rules for `vite.config.ts` only. `target: ES2023`, `lib: [ES2023]` (no DOM). |
| `README.md` | Human-facing overview. DO NOT MODIFY. |
| `CLAUDE.md` | Repo instructions for Claude Code. DO NOT MODIFY. |
| `.gitignore` | See list above. |

## Absent Configuration (verified: these files do not exist)

`eslint.config.*`, `.eslintrc*`, `.prettierrc*`, `postcss.config.*`, `tailwind.config.*`,
`babel.config.*`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`,
`.env`, `.env.example`, `.env.local.example`, `.github/`, `vercel.json`, `netlify.toml`, `Dockerfile`,
`next.config.*`, `jsconfig.json`.

## Working-Tree vs Git HEAD

`git ls-files` still tracks a `src/games/ten-second/` directory (6 files) that is **deleted in the
working tree** (uncommitted deletion), together with uncommitted modifications to `CLAUDE.md`,
`README.md`, `src/games/registry.ts`, and `src/games/number-wheel/config.ts`.

**The current state of the project is the working tree: only `number-wheel` exists.** No source file
references `ten-second`. `src/games/registry.ts` registers exactly one game. Documentation in
`ai-docs` describes the working tree and MUST NOT describe the tracked-but-absent directory as if it
existed. One stale single-game artifact remains in the code — see `12_KNOWN_GAPS_AND_RISKS.md`
(`index.html` `<title>`).
