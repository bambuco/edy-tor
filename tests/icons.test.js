/**
 * @file Tests character glyphs and Font Awesome class resolution.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createIconElement, iconAliases, resolveIcon } from '../src/ui/icons.js';

test('icon values keep glyphs, resolve standard aliases, and accept direct classes', () => {
  assert.ok(iconAliases.size >= 100);
  assert.deepEqual(resolveIcon('★'), { type: 'text', value: '★' });
  assert.deepEqual(resolveIcon('robot'), { type: 'fontawesome', classes: ['fa-solid', 'fa-robot'] });
  assert.deepEqual(resolveIcon('card'), { type: 'fontawesome', classes: ['fa-regular', 'fa-credit-card'] });
  assert.deepEqual(resolveIcon('fa-solid fa-robot'), { type: 'fontawesome', classes: ['fa-solid', 'fa-robot'] });
  assert.deepEqual(resolveIcon('fa-regular fa-credit-card'), { type: 'fontawesome', classes: ['fa-regular', 'fa-credit-card'] });
  assert.deepEqual(resolveIcon('fa-brands fa-github'), { type: 'fontawesome', classes: ['fa-brands', 'fa-github'] });
  assert.deepEqual(resolveIcon('fa-solid fa-unregistered'), { type: 'fontawesome', classes: ['fa-solid', 'fa-unregistered'] });
  assert.equal(resolveIcon(undefined), null);
  assert.throws(() => resolveIcon(12), /character string/);
});

test('Font Awesome icons render as decorative class-based elements', () => {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      style: { props: {}, setProperty(name, value) { this.props[name] = value; } },
      dataset: {},
      classList: { add(...names) { this.names = [...(this.names ?? []), ...names]; } },
      setAttribute(name, value) { this[name] = value; },
    }),
  };
  try {
    const icon = createIconElement('robot');
    assert.equal(icon.className, 'edy-icon');
    assert.equal(icon['aria-hidden'], 'true');
    assert.deepEqual(icon.classList.names, ['fa-solid', 'fa-robot']);
  }
  finally {
    globalThis.document = previous;
  }
});
