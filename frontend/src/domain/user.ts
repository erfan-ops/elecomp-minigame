/**
 * Domain: the registered kiosk user.
 *
 * The mobile number is the user's identity — the registration page collects
 * only the mobile number.
 */
export interface User {
  id: string;
  /** Mobile number exactly as entered, e.g. "09108086113" — never contains spaces. */
  mobile: string;
}

/** How many digits a valid mobile number has (the full 09-form). */
export const MOBILE_DIGIT_COUNT = 11;

/** True when exactly the right number of digits is present. */
export function isValidMobileDigits(digits: string): boolean {
  return new RegExp(`^09\\d{${MOBILE_DIGIT_COUNT-2}}$`).test(digits);
}

/** "09121234567" → "0912 123 4567" (display-only grouping, 4-3-4). */
export function formatMobileDigits(digits: string): string {
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)]
    .filter(Boolean)
    .join(" ");
}

/**
 * "09108086113" → "0910****113" — the mask used by the page-1 leaderboard
 * panel (4 middle digits hidden). Display-only masking — the stored value is
 * reported unchanged, and the digits stay Latin: the bundled fonts render
 * them with Persian glyph shapes already.
 */
export function formatPanelMobile(mobile: string): string {
  return `${mobile.slice(0, 4)}****${mobile.slice(8)}`;
}

/** Unique id for a kiosk session user. */
export function makeUserId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
