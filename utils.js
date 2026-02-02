/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 * @param {string} text - The text to truncate
 * @param {number} max - Maximum length (default: 1024 for Discord embed limits)
 * @returns {string} Truncated text
 */
export function short(text, max = 1024) {
  if (text.length > max) {
    return text.substring(0, max - 4) + "...";
  }
  return text;
}
