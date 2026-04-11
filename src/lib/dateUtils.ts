/**
 * Utility functions to handle dates in UTC throughout the project.
 * This ensures that dates are displayed and saved exactly as they appear in Supabase,
 * ignoring the user's local browser timezone.
 */

/**
 * Formats a date string or object to a human-readable locale string forced in UTC.
 */
export const formatDateUTC = (date: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Default values if not provided
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
    timeZone: 'UTC' // This is the crucial part
  };
  
  return d.toLocaleDateString('es-ES', defaultOptions);
};

/**
 * Formats a date string or object to a time string forced in UTC.
 */
export const formatTimeUTC = (date: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
    timeZone: 'UTC'
  };
  
  return d.toLocaleTimeString('es-ES', defaultOptions);
};

/**
 * Converts an ISO string from Supabase to a format compatible with <input type="datetime-local">
 * without any timezone shifting (treats UTC as local).
 * Input: "2023-10-27T10:00:00.000Z" -> Output: "2023-10-27T10:00"
 */
export const toUTCInputFormat = (date: string | null | undefined): string => {
  if (!date) return '';
  // Simply take the slice up to minutes, ignore the 'Z' and offset
  return date.slice(0, 16);
};

/**
 * Converts a date only ISO string to a format compatible with <input type="date">
 */
export const toUTCDateInputFormat = (date: string | null | undefined): string => {
  if (!date) return '';
  return date.split('T')[0];
};

/**
 * Prepares a date string from a local input to be sent to Supabase as UTC.
 * Since the user enters time intended for UTC, we just append the 'Z'.
 */
export const fromInputToUTC = (date: string | null | undefined): string | null => {
  if (!date) return null;
  // If it's just a date (YYYY-MM-DD), add time
  if (date.length === 10) {
    return `${date}T00:00:00.000Z`;
  }
  // If it's a datetime-local (YYYY-MM-DDTHH:mm), add seconds and Z
  if (date.length === 16) {
    return `${date}:00.000Z`;
  }
  // For anything else, if it doesn't have a timezone indicator, add 'Z'
  if (!date.includes('Z') && !date.includes('+')) {
    return `${date}.000Z`;
  }
  return new Date(date).toISOString();
};
