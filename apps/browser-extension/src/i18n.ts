/**
 * Chrome i18n helper — wraps chrome.i18n.getMessage with a fallback to
 * the key name when the message is not found (e.g. during local development
 * where chrome.i18n may not be available).
 */
export function t(
  key: string,
  substitutions?: string | string[],
): string {
  if (typeof chrome !== "undefined" && chrome.i18n) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }
  // Fallback for dev environments where chrome API isn't available
  return key;
}
