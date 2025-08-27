import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
