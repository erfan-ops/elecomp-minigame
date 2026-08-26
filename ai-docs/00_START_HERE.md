# DOC_ID: AI-00_START_HERE
# SCOPE: Entry point for AI agents; reading order; mandatory maintenance rules
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - package.json
# - index.html
# - src/main.tsx
# - src/app/App.tsx
# - CLAUDE.md
# - README.md

## What This Repository Is

`smartis-game` is a **Persian (RTL) touchscreen kiosk single-page application** for conference events.
It is a **platform** that runs exactly one *pluggable game* at a time. The currently active game is
`number-wheel` — a three-reel digit-matching minigame.

- No backend. No network calls. No router library. No test framework. No linter.
- Runtime dependencies: `react` + `react-dom` only.
- Persistence: browser `localStorage`.
- Kiosk journey is a 5-value phase switch, not URL routing.

## Most Important Files (read in this order)

| Order | Path | Why |
|---|---|---|
| 1 | `src/app/AppSession.tsx` | Single source of truth for the whole session; phase machine |
| 2 | `src/domain/game.ts` | The game contract (`GameContext` / `GameResult` / `GameProps`) |
| 3 | `src/pages/GamePage.tsx` | Adapter between platform and game; builds + persists `GameSessionResult` |
| 4 | `src/games/number-wheel/gameEngine.ts` | Pure minigame state machine |
| 5 | `src/games/number-wheel/components/NumberWheel.tsx` | rAF animation, direct DOM writes, spring settle |
| 6 | `src/games/number-wheel/NumberWheelGame.tsx` | Game shell: input model, `onComplete` emission |
| 7 | `src/config/appConfig.ts` | Platform config (`ACTIVE_GAME_ID`, `MAX_GAME_ATTEMPTS`, `CATEGORIES`) |
| 8 | `src/games/number-wheel/config.ts` | Game tuning (prizes, speeds, spring constants) |
| 9 | `src/services/index.ts` | Persistence implementation selector |
| 10 | `src/domain/gameResult.ts` | Persisted record shape |

## Recommended Reading Order For These Docs

1. `00_START_HERE.md` (this file)
2. `01_PROJECT_OVERVIEW.md`
3. `02_REPOSITORY_STRUCTURE.md`
4. `03_ARCHITECTURE.md`
5. `04_REACT_APPLICATION.md`
6. `05_MINIGAME.md`
7. `06_STATE_AND_DATA_FLOW.md`
8. `07_COMPONENTS_AND_MODULES.md`
9. `08_STYLING_AND_UI_CONVENTIONS.md`
10. `09_BUILD_RUN_DEPLOY.md`
11. `10_CODE_STANDARDS_AND_PATTERNS.md`
12. `11_AI_MAINTENANCE_RULES.md`
13. `12_KNOWN_GAPS_AND_RISKS.md`
14. `design-system.md` (redesigned visual language: canvas, scaling, tokens, ui/ components)

For a task touching only the minigame, the minimum set is `05_MINIGAME.md` + `06_STATE_AND_DATA_FLOW.md` + `10_CODE_STANDARDS_AND_PATTERNS.md`.

## Mandatory AI Documentation Rule

Any AI agent making any change to this repository MUST also update the relevant documentation in `ai-docs` as part of the same change.

The documentation MUST describe only the current state of the project.

Do not add changelogs, historical notes, or time-based update entries.

Full rules and the change-type → doc mapping live in `11_AI_MAINTENANCE_RULES.md`.

## If You Are Modifying The Code — Checklist

- [ ] Read `10_CODE_STANDARDS_AND_PATTERNS.md` before writing a line; match existing idiom exactly.
- [ ] A game MUST NOT import from `src/pages/`, `src/services/`, or `src/app/`. Verify your imports.
- [ ] `onComplete` MUST fire exactly once per mounted game (ref-guarded effect).
- [ ] Do not introduce real `<input>` elements — the kiosk has no physical keyboard on the touch path.
- [ ] Keep Persian numeral conversion in the display layer only (`toPersianDigits`); logic and storage use Latin digits.
- [ ] Never add `letter-spacing` to Persian text.
- [ ] Run the only verification gate: `npm run build` (`tsc -b && vite build`). There are no tests.
- [ ] Delete any temporary verification harness you create (`public/` harness pages, root `.cjs` drivers) so they do not ship in `dist/`.
- [ ] Update every affected `ai-docs` file in the same change. Remove statements that became false.

## Hard Constraints (violating these breaks the product)

| Constraint | Enforced by |
|---|---|
| No page scrolling except the leaderboard list | `src/styles/global.css` (`body { overflow: hidden }`), `src/styles/app.css` (`.leaderboard { overflow-y: auto }`) |
| No real `<input>`; digits via `VirtualNumericKeyboard` | `src/pages/RegistrationPage.tsx` (redesigned `ui/Keypad`), `src/components/VirtualNumericKeyboard.tsx` (retained, unused) |
| All user-facing text Persian; document is `lang="fa" dir="rtl"` | `index.html` |
| Numeric sequences render LTR | `direction: ltr` on `.wheel-group`, `.reel-labels`, `.slot-game__target`, `.game-result__digits`, `.game-result__target-value`, `.prize-card__value`, `.leaderboard__mobile`, `.keyboard` |
| Mobile masked on public screens, stored unmasked | `formatMaskedMobile` in `src/domain/user.ts` |
| Context menu blocked | `src/app/App.tsx` `onContextMenu` |
| Refresh keys suppressed during the game | `src/games/number-wheel/NumberWheelGame.tsx` keydown handler |
