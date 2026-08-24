# Smartis kiosk — Persian conference game platform

A touch-first Persian (RTL) kiosk platform for conference events, built with
React + TypeScript + Vite — no runtime dependencies beyond React, no canvas,
no game engine, no router library.

The kiosk journey: **ثبت‌نام → نظرسنجی → انتخاب دسته‌بندی → بازی → ثبت نتیجه
→ جدول برترین‌ها → کاربر جدید**. Registration collects the **mobile
number** (the player's identity for the session, the leaderboard, and
future billing); the survey asks for the organization's headcount and
whether the player receives benefits (رفاهیات). Both answers are persisted
with every game result. The whole application is optimized for a vertical
touchscreen without a physical keyboard: input happens through an
on-screen numeric keyboard.

## Running

```bash
npm install
npm run dev        # dev server (also reachable from other devices on the LAN)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

## Pluggable games — the core contract

A game is a self-contained React component receiving a `GameContext` and
reporting a `GameResult` — nothing else:

```text
GameContext → Game → GameResult
```

```typescript
// src/domain/game.ts
interface GameContext {
  userId: string; firstName: string; lastName: string;
  mobile: string;                 // canonical, e.g. "+989121234567"
  sector: Category;               // { id, name } — the player's sector
}

interface GameResult {
  score: number;                  // generic ranking score (higher is better)
  winAmount: number;              // prize in configured currency units
  metadata?: Record<string, unknown>;
}

interface GameProps {
  context: GameContext;
  onComplete: (result: GameResult) => void;  // called exactly once
  onExit: () => void;
}
```

The game never sees registration, categories, navigation, storage, the
leaderboard, or billing. The **game host** (`src/pages/GamePage.tsx`)
combines the game's result with the user, sector, game id, and timestamp
into a `GameSessionResult` and hands it to the result repository.

### Bundled games

| id | name | description |
| --- | --- | --- |
| `number-wheel` | بازی اعداد | Stop three rolling digit wheels to match a target number (settable digit-by-digit, or random) |

### Adding or swapping a game

1. Create `src/games/<id>/` implementing `GameProps` (see
   `src/games/number-wheel/` as references —
   each ships its own stylesheet, config, engine, and components).
2. Register it in `src/games/registry.ts`.
3. Set `ACTIVE_GAME_ID` in `src/config/appConfig.ts`.

Registration, category selection, the leaderboard, and persistence need
**no changes**.

## Configuration

| File | Content |
| --- | --- |
| `src/config/appConfig.ts` | Active game, sector categories, `MAX_GAME_ATTEMPTS` |
| `src/games/number-wheel/config.ts` | Number-wheel prizes, wheel speeds, title |
| `src/services/index.ts` | Active result-repository implementation (swap for a backend) |

## Persistence

Pages depend only on the `GameResultRepository` interface
(`save` / `getResults`); the current implementation
(`src/services/localResultRepository.ts`) persists to `localStorage` and
can be replaced by a backend API without touching any page or game.
The leaderboard is built purely from stored results (`src/services/leaderboard.ts`):
best score per user, sorted by score descending with deterministic tie-breaking,
top three with metallic rank styling.

## Kiosk mode

- Windows / Chrome: `chrome.exe --kiosk --fullscreen --disable-pinch <url>`
- Or simply press `F11` in any browser.
- The UI fills the viewport, never scrolls, and disables text selection,
  pinch/double-tap zoom, and the context menu.

## Accessibility

- All controls are real `<button>`s with accessible Persian labels.
- Game state is conveyed by brightness, glow, motion, and text — not color alone.
- `prefers-reduced-motion` slows the wheels, removes the spin blur and
  confetti, and skips decorative CSS animations while keeping the game
  fully playable.

## Architecture

```
src/
├── app/            AppSession (central kiosk session), App, routes
├── pages/          Registration, Survey, CategorySelection, Game (game host), Leaderboard
├── components/     VirtualNumericKeyboard (on-screen numeric keyboard) and shared UI
├── domain/         User, Category, game contract, GameSessionResult, LeaderboardEntry
├── services/       GameResultRepository interface, local impl, leaderboard builder
├── games/          Game registry + one folder per pluggable game
│   └── number-wheel/   NumberWheelGame + components/ + engine + own stylesheet
├── config/         appConfig (active game, categories)
├── utils/          persian.ts (Persian numeral display)
└── styles/         global.css (tokens/base), app.css (platform styles)
```

The number-wheel game is a replaceable module, not the application's core.
