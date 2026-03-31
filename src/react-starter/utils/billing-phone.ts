/**
 * Freemius customer portal JSON can return `phone` as a number when the value is
 * digits-only, and as a string when it contains non-numeric characters (e.g. dashes).
 * Coerce for React inputs and string helpers like `.trim()`.
 */
export function billingPhoneAsString(
  phone: string | number | null | undefined
): string {
  if (phone == null || phone === '') return '';
  return String(phone);
}
