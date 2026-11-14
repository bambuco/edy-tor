/**
 * @file Tests optional decorative icons on list and tree items.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createList } from '../src/ui/controls.js';

test('list and tree icons are decorative, optional, and preserve selection data', () => {
  const previous = globalThis.document;
  const element = () => ({
    children: [],
    attributes: {},
    listeners: {},
    classList: { add() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
    append(child) { this.children.push(child); },
    prepend(child) { this.children.unshift(child); },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    querySelector() { return null; },
  });
  globalThis.document = { createElement: element };
  try {
    let selected;
    const item = { id: 'one', label: 'One', icon: '★' };
    const list = createList([item, { id: 'two', label: 'Two' }], {
      onSelect: (value) => { selected = value; },
    });
    const button = list.children[0].children[0];
    assert.equal(button.textContent, 'One');
    assert.equal(button.children[0].textContent, '★');
    assert.equal(button.children[0].attributes['aria-hidden'], 'true');
    assert.equal(list.children[1].children[0].children.length, 0);
    button.listeners.click();
    assert.equal(selected, item);
    const tree = createList([{ ...item, children: [{ id: 'child', label: 'Child', icon: '◇' }] }], { tree: true });
    const parent = tree.children[0];
    assert.equal(parent.children[0].attributes['aria-expanded'], 'true');
    assert.equal(parent.children[1].children[0].children[0].children[0].textContent, '◇');
    assert.throws(() => createList([{ id: 'bad', label: 'Bad', icon: {} }]), /Icons must be a character string/);
  }
  finally {
    globalThis.document = previous;
  }
});
