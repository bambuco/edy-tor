/**
 * @file Tests dialog close-button placement and behavior for form and other content.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { openDialog } from '../src/ui/controls.js';

test('dialog places its close button in a direct Edy form action row', () => {
  const saved = {
    document: globalThis.document,
    Node: globalThis.Node,
    HTMLElement: globalThis.HTMLElement,
    HTMLFormElement: globalThis.HTMLFormElement,
    ShadowRoot: globalThis.ShadowRoot,
  };
  class Element {
    constructor() {
      this.children = [];
      this.listeners = {};
      this.classList = { contains: (name) => this.className?.split(' ').includes(name) };
    }
    append(...children) { this.children.push(...children); }
    setAttribute() {}
    addEventListener(name, callback) { this.listeners[name] = callback; }
    querySelector(selector) {
      return selector === ':scope > .edy-form__actions'
        ? this.children.find((child) => child.className === 'edy-form__actions') ?? null
        : null;
    }
    showModal() { this.open = true; }
    close() { this.open = false; }
    focus() {}
  }
  class Form extends Element {}
  class ShadowRoot {}
  globalThis.Node = Element;
  globalThis.HTMLElement = Element;
  globalThis.HTMLFormElement = Form;
  globalThis.ShadowRoot = ShadowRoot;
  globalThis.document = { activeElement: null, createElement: () => new Element() };
  try {
    const host = new Element();
    host.getRootNode = () => host;
    const form = new Form();
    form.className = 'edy-form';
    const actions = new Element();
    actions.className = 'edy-form__actions';
    form.append(actions);
    const dialog = openDialog({ title: 'Settings', content: form, closeLabel: 'Close', container: host });
    const close = actions.children[0];
    assert.equal(dialog.children.length, 2);
    assert.equal(close.type, 'button');
    close.listeners.click();
    assert.equal(dialog.open, false);

    const content = new Element();
    const other = openDialog({ title: 'Message', content, closeLabel: 'Close', container: host });
    assert.equal(other.children.length, 3);
    assert.equal(other.children[2].textContent, 'Close');
  }
  finally {
    Object.assign(globalThis, saved);
  }
});
