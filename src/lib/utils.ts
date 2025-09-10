import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { RateType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to YYYY-MM-DD format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "2025-09-15")
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';

  const date =
    typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
}

/**
 * Truncates text to a specified length and adds ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters before truncation
 * @param ellipsis - Custom ellipsis string (default: '...')
 * @returns Truncated text with ellipsis
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Ensure we don't cut words in the middle if possible
  const truncated = text.substring(0, maxLength).trim();
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxLength * 0.8) {
    // If we can find a space in the last 20%
    return truncated.substring(0, lastSpaceIndex) + ellipsis;
  }

  return truncated + ellipsis;
}

/**
 * Truncates text to a specified length without breaking words
 * @param text - The text to truncate
 * @param maxLength - Maximum number of characters before truncation
 * @param ellipsis - Custom ellipsis string (default: '...')
 * @returns Truncated text with ellipsis
 */
export function truncateTextSmart(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Find the last complete word within the limit
  const words = text.split(' ');
  let result = '';

  for (const word of words) {
    if ((result + ' ' + word).length <= maxLength) {
      result += (result ? ' ' : '') + word;
    } else {
      break;
    }
  }

  return result + ellipsis;
}

/**
 * Converts empty strings to null for string fields
 * @param value - The string value to check and convert
 * @returns The original value or null if it's an empty string
 */
export function convertEmptyToNull(
  value: string | null | undefined
): string | null | undefined {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * Converts empty strings to null specifically for rate_type fields
 * @param value - The rate type value to check and convert
 * @returns The original value or null if it's an empty string
 */
export function convertRateTypeEmptyToNull(
  value: RateType | null | undefined
): RateType | null | undefined {
  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }
  return value;
}

/**
 * Converts empty strings to null specifically for currency_code fields
 * @param value - The currency code value to check and convert
 * @returns The original value or null if it's an empty string
 */
export function convertCurrencyEmptyToNull(
  value: string | null | undefined
): string | null | undefined {
  return convertEmptyToNull(value);
}

/**
 * Gets the display name for an assignee user
 * @param assigneeUser - The assignee user object with name and email
 * @param currentUserId - The current user's ID to add "(You)" suffix
 * @returns The display name or null if no assignee
 */
export function getAssigneeDisplayName(
  assigneeUser?: { name?: string; email: string },
  currentUserId?: string,
  assigneeId?: string
): string | null {
  if (!assigneeUser) return null;

  const displayName = assigneeUser.name || assigneeUser.email;

  // Add "(You)" suffix if this is the current user
  if (currentUserId && assigneeId && currentUserId === assigneeId) {
    return `${displayName} (You)`;
  }

  return displayName;
}

/**
 * Validates that pricing fields are consistent (all present or all null)
 * @param rateType - The rate type value
 * @param price - The price value
 * @param currencyCode - The currency code value
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePricingConsistency(
  rateType: RateType | null | undefined,
  price: number | null | undefined,
  currencyCode: string | null | undefined
): { isValid: boolean; error?: string } {
  const hasRateType = rateType !== null && rateType !== undefined;
  const hasPrice = price !== null && price !== undefined && price >= 0;
  const hasCurrencyCode =
    currencyCode !== null &&
    currencyCode !== undefined &&
    currencyCode.trim() !== '';

  const allPresent = hasRateType && hasPrice && hasCurrencyCode;
  const allAbsent = !hasRateType && !hasPrice && !hasCurrencyCode;

  if (allPresent || allAbsent) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error:
      'Pricing fields must all be filled or all be empty. Please provide rate type, price, and currency together, or leave all pricing fields empty.',
  };
}

/**
 * Checks if any pricing field has a value
 * @param rateType - The rate type value
 * @param price - The price value
 * @param currencyCode - The currency code value
 * @returns True if any pricing field has a value
 */
export function hasAnyPricingField(
  rateType: RateType | null | undefined,
  price: number | null | undefined,
  currencyCode: string | null | undefined
): boolean {
  const hasRateType = rateType !== null && rateType !== undefined;
  const hasPrice = price !== null && price !== undefined && price >= 0;
  const hasCurrencyCode =
    currencyCode !== null &&
    currencyCode !== undefined &&
    currencyCode.trim() !== '';

  return hasRateType || hasPrice || hasCurrencyCode;
}
