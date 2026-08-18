/**
 * Presentation helper: renders Latin digits 0–9 as Persian numerals (۰–۹).
 * Game logic keeps using plain numbers — only the display layer converts.
 */
const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}
