/**
 * @file Parses and matches scoped keyboard shortcuts declared by menu contributions.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Parses a shortcut with explicit modifiers and a single character or function key.
 * @param {string} value Shortcut such as Ctrl+Shift+G.
 * @returns {{key: string, ctrl: boolean, alt: boolean, shift: boolean, meta: boolean, canonical: string}} Parsed shortcut.
 */
export function parseShortcut(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError('Shortcuts must be non-empty strings.');
  }
  const parts = value.split('+').map((part) => part.trim());
  const key = parts.pop();
  const modifiers = new Set();
  for (const part of parts) {
    const modifier = part.toLowerCase();
    if (!['ctrl', 'alt', 'shift', 'meta'].includes(modifier) || modifiers.has(modifier)) {
      throw new TypeError(`Invalid shortcut "${value}".`);
    }
    modifiers.add(modifier);
  }
  if (!key || !(/^.$/u.test(key) || /^F([1-9]|1[0-2])$/i.test(key)) ||
      (!modifiers.has('ctrl') && !modifiers.has('alt') && !modifiers.has('meta') && !/^F([1-9]|1[0-2])$/i.test(key))) {
    throw new TypeError(`Invalid shortcut "${value}"; use Ctrl, Alt, Meta, or a function key.`);
  }
  const normalizedKey = key.toLowerCase();
  const ordered = ['ctrl', 'alt', 'shift', 'meta'].filter((modifier) => modifiers.has(modifier));
  return {
    key: normalizedKey,
    ctrl: modifiers.has('ctrl'),
    alt: modifiers.has('alt'),
    shift: modifiers.has('shift'),
    meta: modifiers.has('meta'),
    canonical: [...ordered, normalizedKey].join('+'),
  };
}

/**
 * Checks an event against a parsed shortcut.
 * @param {KeyboardEvent} event Keyboard event.
 * @param {ReturnType<typeof parseShortcut>} shortcut Parsed shortcut.
 * @returns {boolean} Whether all keys and modifiers match.
 */
export function matchesShortcut(event, shortcut) {
  return event.key.toLowerCase() === shortcut.key && event.ctrlKey === shortcut.ctrl &&
    event.altKey === shortcut.alt && event.shiftKey === shortcut.shift && event.metaKey === shortcut.meta;
}
