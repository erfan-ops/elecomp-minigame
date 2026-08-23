/**
 * ============================================================================
 *  APPLICATION CONFIGURATION — EDIT HERE
 *
 *  Conference organizers: this file configures the platform itself
 *  (which game is active and which sectors exist). Prize tuning for the
 *  number-wheel game lives in src/games/number-wheel/config.ts.
 * ============================================================================
 */
import type { Category } from "../domain/category";

/** The id of the game the kiosk currently runs — see src/games/registry.ts. */
export const ACTIVE_GAME_ID = "number-wheel";

/**
 * How many times a player may retry the game after winning nothing.
 * A player who has won anything can never retry, regardless of this value.
 */
export const MAX_GAME_ATTEMPTS = 3;

/** Sector categories the player can choose from. */
export const CATEGORIES: readonly Category[] = [
  { id: "fashion", name: "پوشاک" },
  { id: "digital", name: "کالای دیجیتال" },
  { id: "sports", name: "ورزش" },
  { id: "restaurant", name: "رستوران و کافه" },
  { id: "entertainment", name: "سرگرمی" },
  { id: "appliance", name: "لوازم خانگی" },
  { id: "beauty", name: "سلامت و زیبایی" },
  { id: "stationery", name: "کتاب و نوشت‌افزار" },
];
