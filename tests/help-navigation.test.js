/**
 * @file Tests the generated help's compact navigation interactions.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';

test('compact help navigation toggles and closes with Escape', async () => {
  const previousDocument = globalThis.document;
  const previousStyle = globalThis.getComputedStyle;
  const classes = new Set();
  const button = {
    hidden: true,
    attributes: {},
    addEventListener(name, callback) { this[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
  };
  const navigation = {
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name) {
        if (classes.has(name)) { classes.delete(name); return false; }
        classes.add(name);
        return true;
      },
    },
    addEventListener(name, callback) { this[name] = callback; },
  };
  globalThis.document = { querySelector: (selector) => selector === '.menu-toggle' ? button : navigation };
  globalThis.getComputedStyle = () => ({ display: 'block' });
  try {
    await import('../scripts/help-navigation.js');
    assert.equal(button.hidden, false);
    assert.equal(classes.has('is-collapsible'), true);
    button.click();
    assert.equal(button.attributes['aria-expanded'], 'true');
    assert.equal(classes.has('is-open'), true);
    navigation.keydown({ key: 'Escape' });
    assert.equal(button.attributes['aria-expanded'], 'false');
    assert.equal(classes.has('is-open'), false);
    assert.equal(button.focused, true);
  }
  finally {
    globalThis.document = previousDocument;
    globalThis.getComputedStyle = previousStyle;
  }
});
