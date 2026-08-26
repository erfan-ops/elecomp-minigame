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

/**
 * Sector categories the player can choose from — the Figma frame-4 set
 * (2026-08-26). Array order is the visual order: the grid renders LTR, so
 * پوشاک is top-left and کالای دیجیتال (the last item) spans both columns.
 */
export const CATEGORIES: readonly Category[] = [
  { id: "clothing", name: "پوشاک" },
  { id: "daily-shopping", name: "خرید روزانه" },
  { id: "jewelry", name: "طلا و زیورآلات" },
  { id: "travel", name: "سفر و گردشگری" },
  { id: "beauty", name: "زیبایی و سلامت" },
  { id: "sports", name: "ورزشی" },
  { id: "digital", name: "کالای دیجیتال" },
];
