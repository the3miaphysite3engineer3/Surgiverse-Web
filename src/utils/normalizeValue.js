/**
 * Normalizes text values for case-insensitive comparisons.
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeValue = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
