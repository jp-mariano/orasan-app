import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { RateType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a user-friendly format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Dec 15, 2024")
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';

  const date =
    typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
