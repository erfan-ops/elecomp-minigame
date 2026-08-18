/**
 * Domain: the registered kiosk user.
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  /** Canonical mobile number, e.g. "+989121234567" — never contains spaces. */
  mobile: string;
}

/** Country prefix shown on the registration page and prepended to the canonical number. */
export const MOBILE_PREFIX = "+98";

/** How many digits a valid mobile number has after the prefix. */
export const MOBILE_DIGIT_COUNT = 10;

/** Max length for the name fields. */
export const NAME_MAX_LENGTH = 40;

/** "9121234567" → "+989121234567" */
export function toCanonicalMobile(digits: string): string {
  return MOBILE_PREFIX + digits;
}

/** True when exactly the right number of digits is present. */
export function isValidMobileDigits(digits: string): boolean {
  return new RegExp(`^\\d{${MOBILE_DIGIT_COUNT}}$`).test(digits);
}

/** "9121234567" → "912 123 4567" (display-only grouping, 3-3-4). */
export function formatMobileDigits(digits: string): string {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)]
    .filter(Boolean)
    .join(" ");
}

/** Unique id for a kiosk session user. */
export function makeUserId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
