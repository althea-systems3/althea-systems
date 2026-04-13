/**
 * Sanitize text input for defense-in-depth before DB storage.
 * Strips HTML tags, collapses excessive whitespace, trims, and truncates.
 * React handles output escaping; this is an additional input layer.
 */
export function sanitizeText(value: unknown, maxLength = 5000): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/\s{3,}/g, '  ')
    .slice(0, maxLength);
}
