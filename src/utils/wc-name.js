// World Cup name normalization — slug-safe key for WC team name lookups.

/**
 * Normalize a WC team name to a consistent lookup key.
 * Strips diacritics, lowercases, replaces non-alphanumeric runs with underscores.
 */
export function _normWCName(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
