/**
 * Game registry types — the platform side of the game contract.
 *
 * A game module must export a React component of type GameProps
 * (src/domain/game.ts) and register itself here.
 */
import type { ComponentType } from "react";
import type { GameProps } from "../domain/game";

export interface GameDefinition {
  /** Stable unique id, used in persisted results (e.g. "number-wheel"). */
  id: string;
  /** Persian display name. */
  name: string;
  Component: ComponentType<GameProps>;
}
