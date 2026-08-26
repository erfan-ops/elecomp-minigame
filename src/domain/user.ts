/**
 * Domain: the registered kiosk user.
 *
 * The mobile number is the user's identity — the registration page collects
 * only the mobile number.
 */
export interface User {
  id: string;
  /** Canonical mobile number, e.g. "+989121234567" — never contains spaces. */
  mobile: string;
}

/** Country prefix shown on the registration page and prepended to the canonical number. */
export const MOBILE_PREFIX = "+98";

/** How many digits a valid mobile number has after the prefix. */
export const MOBILE_DIGIT_COUNT = 11;

/** "9121234567" → "+989121234567" */
export function toCanonicalMobile(digits: string): string {
  return MOBILE_PREFIX + digits;
}

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
 * "+989121234567" → "0912****567" for public screens (game chip,
 * leaderboard). Display-only masking — the canonical value is stored and
 * reported unchanged, and the digits stay Latin: the bundled font renders
 * them with Persian glyph shapes already.
 */
export function formatMaskedMobile(canonical: string): string {
  const digits = canonical.slice(MOBILE_PREFIX.length);
  const masked = digits.slice(0, 4) + "****" + digits.slice(8);
  return [masked.slice(0, 4), masked.slice(4, 7), masked.slice(7)]
    .filter(Boolean)
    .join(" ");
}

/**
 * "+989121234567" → "0912****567" — the 09-form used by the page-1
 * leaderboard panel (4 middle digits masked). Display helper only.
 */
export function formatPanelMobile(canonical: string): string {
  const digits = canonical.slice(MOBILE_PREFIX.length);
  return `0${digits.slice(0, 3)}****${digits.slice(7)}`;
}

/** Unique id for a kiosk session user. */
export function makeUserId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
