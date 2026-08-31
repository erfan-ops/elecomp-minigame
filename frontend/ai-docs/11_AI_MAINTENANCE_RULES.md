# DOC_ID: AI-11_AI_MAINTENANCE_RULES
# SCOPE: Mandatory rules for any AI agent that reads or modifies this repository
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - ai-docs/ (this package)
# - CLAUDE.md
# - README.md

**This document is mandatory. It is not advisory.**

Any AI agent working in this repository MUST follow every rule below. These rules exist so that
`ai-docs/` never drifts from the code, and so that the next agent can trust it without re-reading the
whole codebase.

## THE CORE RULE

> **Every AI agent that changes this repository MUST update `ai-docs/` in the same change.**
>
> A code change and its documentation update are ONE unit of work. A change that alters behavior,
> structure, contracts, state, styling conventions, build steps, or dependencies and does NOT update the
> affected `ai-docs` files is **incomplete**. Do not report such a change as done.

## The 13 Rules

### Rule 1 — Read `ai-docs/` before touching anything
Start at `ai-docs/00_START_HERE.md`. Read the documents relevant to the area you are changing before
reading source. Do not begin editing based on assumptions about this project's conventions — they are
written down.

### Rule 2 — Treat source code as the highest source of truth
`ai-docs/`, `README.md`, and `CLAUDE.md` are secondary. If a document contradicts the code, **the code
wins**. Fix the document (if it is in `ai-docs/`) and record the contradiction in
`ai-docs/12_KNOWN_GAPS_AND_RISKS.md`. Never "fix" the code to match a document without explicit
instruction.

### Rule 3 — Update `ai-docs/` in the same change as the code
Use the `| Change Type | Docs to Update |` table below to decide which files. Update the affected
documents' bodies AND their `# STATUS:` / `# PRIMARY_SOURCE_PATHS:` metadata if those changed. Never
defer documentation to "a follow-up".

### Rule 4 — Document only the current state
`ai-docs/` describes what the code IS, never what it WAS. It MUST NOT contain:
change history, changelogs, migration notes, "previously", "we changed", "old version", "now uses",
"recently", "deprecated in favour of", dates, timestamps, authors, version numbers of the project, or
update logs. When you change something, **rewrite the affected statements** so they describe the new
state as if it had always been that way. Delete the old statements; do not annotate them.

### Rule 5 — Be factual; never invent
Every statement MUST be verifiable from a file in this repository. Do not guess at intent, do not
extrapolate, do not describe features that do not exist. If a table cell has no verifiable value, write
`UNKNOWN`.

### Rule 6 — Label uncertainty explicitly
Use exactly these labels, inline, with a short reason:

| Label | Use when |
|---|---|
| `VERIFIED` | Read directly from source in this repository |
| `INFERRED` | A consistent pattern or evident intent, not stated anywhere — say what it is inferred from |
| `UNVERIFIED` | Plausible but not confirmed by reading the relevant source or by running anything |
| `UNKNOWN` | Not discoverable from the repository at all |

Each document's header `# STATUS:` MUST be one of `VERIFIED`, `PARTIAL`, or `INFERRED` and MUST reflect
the weakest claim in the document.

### Rule 7 — Preserve the metadata block in every document
Every file in `ai-docs/` MUST begin with, in this order:

```
# DOC_ID: <stable identifier>
# SCOPE: <one line>
# STATUS: VERIFIED | PARTIAL | INFERRED
# PRIMARY_SOURCE_PATHS:
# - <path>
# - <path>
```

Never remove or reorder these lines. When you document a new source file in a document, add its path to
that document's `# PRIMARY_SOURCE_PATHS:` list.

### Rule 8 — Only write inside `ai-docs/`
When your task is documentation, you MUST NOT modify application source code, configuration files,
`README.md`, or `CLAUDE.md`. Create, update, replace, or organize files inside `ai-docs/` only.
When your task IS a code change, Rule 3 still applies: the code change and the `ai-docs/` update ship
together.

### Rule 9 — Never write secrets into `ai-docs/`
No API keys, tokens, passwords, private URLs, connection strings, or secret environment values. Document
environment variable **names** and purposes only. (This project currently uses **no** environment
variables — see `09_BUILD_RUN_DEPLOY.md`.) Do not copy the contents of `.env*` files or
`.claude/settings.local.json` credentials-like values into documentation.

### Rule 10 — Do not read generated or dependency directories
Do not read or document `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `.cache/`, or
`*.tsbuildinfo`. Inspecting `package-lock.json` for **dependency metadata** (resolved versions, declared
engines) is allowed; do not read it wholesale.

### Rule 11 — Respect the architectural invariants
These are enforced by code review and by the contracts documented in `03_ARCHITECTURE.md`,
`05_MINIGAME.md`, and `06_STATE_AND_DATA_FLOW.md`. Breaking one is a defect even if it type-checks:

1. Games MUST NOT import from `src/app/`, `src/pages/`, or `src/services/`.
2. `onComplete` MUST be called exactly once per mounted game instance.
3. `phase` MUST only change through a session action in `src/app/AppSession.tsx`.
4. Persistence MUST go through `GameResultRepository`; no component may touch `localStorage`.
5. `src/domain/`, `src/services/leaderboard.ts`, `src/services/stats.ts`, `src/utils/persian.ts`,
   `src/games/number-wheel/gameEngine.ts`, and `src/games/number-wheel/prizeCalculator.ts` MUST stay
   React-free, DOM-free, and side-effect-free.
6. Per-frame animation values MUST live in refs written straight to the DOM — no React state per frame.
7. No real `<input>` elements. The on-screen numeric keyboard is the only text-entry mechanism.
8. Persian numerals are display-only; state and storage use Latin digits and ISO timestamps.
9. Numeric sequences MUST set `direction: ltr`; Persian text MUST NOT get `letter-spacing`.
10. No page scrolling anywhere — the registration leaderboard panel shows only the top 5.
11. Adding a field to `GameSessionResult` REQUIRES updating `isGameSessionResult` in
    `src/services/localResultRepository.ts`.

### Rule 12 — Run the only gate before reporting completion
`npm run build` (`tsc -b && vite build`) is the sole automated quality gate. Run it after any code change.
There is no test suite and no linter — do not claim tests pass, and do not claim behavior is verified
unless you actually exercised it. If you used the temporary-harness verification workflow documented in
`09_BUILD_RUN_DEPLOY.md`, **delete the harness afterwards** so it does not ship in `dist/`.

### Rule 13 — Keep `ai-docs/` non-redundant and navigable
One fact lives in one place; cross-reference instead of duplicating. If you add a document, give it a
numeric prefix that fits the existing sequence, add its metadata block, and link it from
`ai-docs/00_START_HERE.md`. Do not create a second document covering an existing document's scope. Delete
statements that have become false rather than adding a contradicting statement next to them.

## Before Completing Any Change

Work through this list. Every box MUST be true before you report the work as done.

- [ ] I read the relevant `ai-docs/` documents before editing.
- [ ] My change respects every invariant in Rule 11.
- [ ] `npm run build` passes (`tsc -b && vite build`), and I have the output to prove it.
- [ ] `noUnusedLocals` / `noUnusedParameters` violations are cleared (no leftover unused imports,
      variables, or parameters).
- [ ] Every new type-only import uses `import type` (`verbatimModuleSyntax`).
- [ ] Every new effect that starts a loop, timer, or listener has a cleanup.
- [ ] Any new user-facing string is Persian, and any numeric display goes through
      `toPersianDigits` / `formatPersianNumber`.
- [ ] Any new tuning value lives in the appropriate `config.ts`, not inline.
- [ ] Any new style follows the rules in `08_STYLING_AND_UI_CONVENTIONS.md` (correct stylesheet, BEM-ish
      naming, `clamp()` instead of a breakpoint, no inline styles, no `letter-spacing` on Persian).
- [ ] I updated every `ai-docs/` file listed for my change type in the table below.
- [ ] Updated documents describe **only the current state** — no history, no dates, no "previously".
- [ ] Uncertain statements carry `INFERRED` / `UNVERIFIED` / `UNKNOWN` with a reason.
- [ ] Each touched document's `# STATUS:` and `# PRIMARY_SOURCE_PATHS:` are still accurate.
- [ ] New or changed inconsistencies, dead code, and risks are recorded in
      `12_KNOWN_GAPS_AND_RISKS.md`; resolved ones are **removed** from it.
- [ ] No secrets appear anywhere in `ai-docs/`.
- [ ] Any temporary verification harness or script I created is deleted.
- [ ] I did NOT modify `README.md` or `CLAUDE.md` unless the user explicitly asked me to.

## Change Type → Docs To Update

| Change Type | Docs to Update |
|---|---|
| Any code change at all | `12_KNOWN_GAPS_AND_RISKS.md` (add/remove affected entries) |
| New or removed file / directory | `02_REPOSITORY_STRUCTURE.md`, `07_COMPONENTS_AND_MODULES.md` |
| New or removed dependency | `01_PROJECT_OVERVIEW.md` (Stack), `09_BUILD_RUN_DEPLOY.md`, `10_CODE_STANDARDS_AND_PATTERNS.md` if it changes a pattern |
| New phase / route / navigation change | `03_ARCHITECTURE.md` (routing + transition table), `04_REACT_APPLICATION.md` (pages table), `06_STATE_AND_DATA_FLOW.md`, `01_PROJECT_OVERVIEW.md` (journey table) |
| Change to `AppSession` state or actions | `06_STATE_AND_DATA_FLOW.md` (state table + update rules), `04_REACT_APPLICATION.md` (`AppSessionValue` table), `03_ARCHITECTURE.md` (state ownership) |
| Change to the game contract (`src/domain/game.ts`) | `03_ARCHITECTURE.md`, `05_MINIGAME.md`, `06_STATE_AND_DATA_FLOW.md`, `07_COMPONENTS_AND_MODULES.md`, `12_KNOWN_GAPS_AND_RISKS.md` (README shows a different `GameContext`) |
| Change to `GameSessionResult` / `LeaderboardEntry` | `06_STATE_AND_DATA_FLOW.md` (types + persistence), `07_COMPONENTS_AND_MODULES.md`, and confirm `isGameSessionResult` was updated |
| Adding, removing, or swapping a game | `01_PROJECT_OVERVIEW.md`, `02_REPOSITORY_STRUCTURE.md`, `03_ARCHITECTURE.md` (game integration), `05_MINIGAME.md` (or a new `05x_<GAME>.md` with the same mandated sections), `07_COMPONENTS_AND_MODULES.md` |
| Game mechanics, loop, timing, or input change | `05_MINIGAME.md` (all seven mandated sections), `06_STATE_AND_DATA_FLOW.md` if state shape changed |
| Change to game tuning constants (`config.ts`) | `05_MINIGAME.md` (constants table), `01_PROJECT_OVERVIEW.md` if prize amounts or the title changed |
| Change to platform config (`src/config/appConfig.ts`) | `01_PROJECT_OVERVIEW.md`, `03_ARCHITECTURE.md`, `07_COMPONENTS_AND_MODULES.md` |
| Change to persistence / repository implementation | `06_STATE_AND_DATA_FLOW.md` (persistence layer), `07_COMPONENTS_AND_MODULES.md`, `09_BUILD_RUN_DEPLOY.md` (external services), `03_ARCHITECTURE.md` (side-effect boundaries) |
| New page, component, or hook | `04_REACT_APPLICATION.md`, `07_COMPONENTS_AND_MODULES.md` |
| Styling, token, or class-naming change | `08_STYLING_AND_UI_CONVENTIONS.md` |
| New animation or motion behavior | `08_STYLING_AND_UI_CONVENTIONS.md`, `05_MINIGAME.md` if it is in the game loop, plus the reduced-motion notes |
| Build, script, tsconfig, or Vite config change | `09_BUILD_RUN_DEPLOY.md`, `10_CODE_STANDARDS_AND_PATTERNS.md` (strictness table) |
| Introducing environment variables | `09_BUILD_RUN_DEPLOY.md` (names + purpose ONLY, never values) |
| Introducing tests, a linter, or a formatter | `09_BUILD_RUN_DEPLOY.md`, `10_CODE_STANDARDS_AND_PATTERNS.md`, `12_KNOWN_GAPS_AND_RISKS.md` (remove the "no tests" risk entries) |
| Deployment or CI setup | `09_BUILD_RUN_DEPLOY.md` (replace the `UNKNOWN` deployment target), `01_PROJECT_OVERVIEW.md` (Stack → Deployment) |
| Fixing an item listed in `12_KNOWN_GAPS_AND_RISKS.md` | Remove that entry from `12_KNOWN_GAPS_AND_RISKS.md` and correct every document that described the old behavior |
| Adding a document to `ai-docs/` | `00_START_HERE.md` (reading order / index) |

## If You Cannot Follow A Rule

State plainly which rule you could not follow and why, in your response to the user. Do not silently skip
a rule, and do not weaken a document to make a rule look satisfied.
