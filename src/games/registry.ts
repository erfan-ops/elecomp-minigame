/**
 * The game registry.
 *
 * Adding a new game means: create src/games/<id>/ implementing GameProps,
 * register it below, and set ACTIVE_GAME_ID in src/config/appConfig.ts.
 * Registration, category selection, the leaderboard, and persistence
 * need no changes.
 */
import { ACTIVE_GAME_ID } from "../config/appConfig";
import type { GameDefinition } from "./Game";
import { NumberWheelGame } from "./number-wheel/NumberWheelGame";

export const GAME_DEFINITIONS: readonly GameDefinition[] = [
  {
    id: "number-wheel",
    name: "بازی اعداد",
    Component: NumberWheelGame,
  },
];

/** The game the kiosk currently runs; falls back to the first registered game. */
export function getActiveGame(): GameDefinition {
  return (
    GAME_DEFINITIONS.find((game) => game.id === ACTIVE_GAME_ID) ??
    GAME_DEFINITIONS[0]
  );
}
