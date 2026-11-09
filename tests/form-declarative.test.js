/**
 * @file Tests declarative form visibility, sortable fields and groups.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createForm } from '../src/ui/controls.js';

function withDocument(run) {
  const previous = globalThis.document;
  const nodes = [];
  let focused;
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.listeners = {};
      this.attributes = {};
      this.value = '';
      this.hidden = false;
      this.classList = { add() {} };
      nodes.push(this);
    }
    append(...children) { this.children.push(...children); }
    insertBefore(child, reference) { this.children.splice(this.children.indexOf(reference), 0, child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    dispatchEvent(event) { this.listeners[event.type]?.(event); }
    checkValidity() { return this.disabled || !this.required || Boolean(this.value); }
    querySelector(selector) {
      for (const child of this.children) {
        if (child.tag === selector) return child;
        const found = child.querySelector?.(selector);
        if (found) return found;
      }
      return null;
    }
    querySelectorAll(selector) {
      return this.children.flatMap((child) =>
        [...(child.tag === selector ? [child] : []), ...(child.querySelectorAll?.(selector) ?? [])]);
    }
    focus() { focused = this; }
    fire(name) { this.listeners[name]?.({ preventDefault() {} }); }
  }
  globalThis.document = {
    createElement: (tag) => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
    createTextNode: (text) => ({ textContent: text }),
  };
  try { run({ nodes, focused: () => focused }); }
  finally { globalThis.document = previous; }
}

test('visibility retains values, clears errors and focuses the first visible invalid field', () => {
  withDocument(({ nodes, focused }) => {
    const submitted = [];
    const form = createForm({
      translate: (key) => key,
      fields: [
        { name: 'count', type: 'number', value: 3 },
        { name: 'conditional', required: true, visibleWhen: { field: 'count', equals: 3 } },
        { name: 'other', required: true, visibleWhen: (values) => values.count === '4' },
      ],
      onSubmit: (values) => submitted.push(values),
    });
    const count = nodes.find((node) => node.name === 'count');
    const conditional = nodes.find((node) => node.name === 'conditional');
    const other = nodes.find((node) => node.name === 'other');
    // Native inputs coerce initial values to strings.
    count.value = '3';
    count.fire('input');
    form.fire('submit');
    assert.equal(focused(), conditional);
    assert.equal(conditional.attributes['aria-invalid'], 'true');
    count.value = '4';
    count.fire('input');
    assert.equal(conditional.attributes['aria-invalid'], 'false');
    form.fire('submit');
    assert.equal(focused(), other);
    other.value = 'ok';
    other.fire('input');
    form.fire('submit');
    assert.deepEqual(submitted, [{ count: '4', other: 'ok' }]);
    conditional.value = 'retained';
    count.value = '3';
    count.fire('input');
    form.fire('submit');
    assert.deepEqual(submitted.at(-1), { count: '3', conditional: 'retained' });
    count.value = '';
    count.fire('input');
    form.fire('submit');
    assert.deepEqual(submitted.at(-1), { count: '' });
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'x', visibleWhen: { field: 'missing', equals: 1 } },
    ] }), /unknown field/);
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'x', visibleWhen: { field: 'x' } },
    ] }), /requires a field and equals value/);
  });
});

test('sortable values can be added, edited, moved and removed, including in collapsed groups', () => {
  withDocument(({ nodes, focused }) => {
    const submitted = [];
    const form = createForm({
      translate: (key) => key,
      fields: [
        { type: 'group', label: 'Options', collapsed: true, fields: [
          { name: 'items', label: 'Items', type: 'sortable', required: true, value: [] },
        ] },
        { type: 'group', label: 'Other', collapsed: true, fields: [
          { name: 'plain', value: 'yes' },
        ] },
      ],
      onSubmit: (values) => submitted.push(values),
    });
    const groups = nodes.filter((node) => node.tag === 'details');
    const list = nodes.find((node) => node.tag === 'ol');
    const add = nodes.find((node) => node.attributes['aria-label'] === 'listAdd');
    form.fire('submit');
    assert.equal(groups[0].open, true);
    assert.equal(groups[1].open, false);
    assert.equal(focused(), add);
    add.fire('click');
    let first = list.children[0].children[0];
    first.value = 'one';
    first.fire('input');
    add.fire('click');
    let second = list.children[1].children[0];
    second.value = 'two';
    second.fire('input');
    list.children[1].children[1].fire('click');
    assert.equal(focused().value, 'two');
    list.children[0].children[2].fire('click');
    assert.equal(focused().value, 'two');
    list.children[1].children[1].fire('click');
    groups[0].open = false;
    form.fire('submit');
    assert.deepEqual(submitted.at(-1), { items: ['two', 'one'], plain: 'yes' });
    list.children[0].children[3].fire('click');
    form.fire('submit');
    assert.deepEqual(submitted.at(-1).items, ['one']);
    list.children[0].children[3].fire('click');
    assert.equal(focused(), add);
    form.fire('submit');
    assert.equal(submitted.length, 2);
    assert.equal(groups[0].open, true);
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'invalid', type: 'sortable', value: [1] },
    ] }), /array of strings/);
  });
});

test('sortable editing and addition can be configured independently', () => {
  withDocument(({ nodes, focused }) => {
    const submitted = [];
    const form = createForm({ translate: (key) => key, onSubmit: (value) => submitted.push(value), fields: [
      { name: 'items', type: 'sortable', value: ['first', 'second'], editText: false, allowAdd: false },
    ] });
    const list = nodes.find((node) => node.tag === 'ol');
    const add = nodes.find((node) => node.attributes['aria-label'] === 'listAdd');
    assert.equal(add.hidden, true);
    assert.equal(list.children[0].children[0].readOnly, true);
    assert.equal(list.children[0].children[1].attributes['aria-label'], 'listMoveUp: items 1');
    assert.equal(list.children[0].children[1].children[0].tag, 'svg');
    list.children[1].children[1].fire('click');
    form.fire('submit');
    assert.deepEqual(submitted[0], { items: ['second', 'first'] });
    list.children[0].children[3].fire('click');
    list.children[0].children[3].fire('click');
    assert.equal(focused().tag, 'fieldset');
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'x', type: 'sortable', allowAdd: 'no' },
    ] }), /booleans/);
  });
});

test('table supports editable and fixed rows with isolated submitted values', () => {
  withDocument(({ nodes, focused }) => {
    const submitted = [];
    const columns = [{ name: 'key', label: 'Key' }, { name: 'value', label: 'Value' }];
    const original = [{ key: 'name', value: 'Edy' }];
    const form = createForm({ translate: (key) => key, onSubmit: (value) => submitted.push(value), fields: [
      { type: 'group', label: 'Tables', collapsed: true, fields: [
        { name: 'items', type: 'table', columns, value: original, required: true },
      ] },
      { name: 'fixed', type: 'table', columns, editable: false, value: [{ key: 'x', value: 'y' }] },
    ] });
    const bodies = nodes.filter((node) => node.tag === 'tbody');
    const adds = nodes.filter((node) => node.attributes['aria-label'] === 'tableAdd');
    assert.equal(adds[1].hidden, true);
    assert.equal(bodies[1].children[0].children[0].textContent, 'x');
    adds[0].fire('click');
    assert.equal(focused().tag, 'input');
    const cell = bodies[0].children[1].children[0].children[0];
    cell.value = 'title';
    cell.fire('input');
    form.fire('submit');
    assert.deepEqual(submitted[0].items, [{ key: 'name', value: 'Edy' }, { key: 'title', value: '' }]);
    submitted[0].items[0].key = 'external';
    assert.equal(original[0].key, 'name');
    bodies[0].children[1].children[2].children[0].fire('click');
    bodies[0].children[0].children[2].children[0].fire('click');
    form.fire('submit');
    assert.equal(submitted.length, 1);
    assert.equal(nodes.find((node) => node.tag === 'details').open, true);
    assert.equal(focused(), adds[0]);
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'bad', type: 'table', columns, value: [{ key: 'incomplete' }] },
    ] }), /rows of string values/);
  });
});

test('CodeMirror rejects unknown languages and reports iframe loading failures', () => {
  withDocument(({ nodes }) => {
    const errors = [];
    const submitted = [];
    const form = createForm({ translate: (key) => key, onError: (error) => errors.push(error),
      onSubmit: (values) => submitted.push(values),
      fields: [{ name: 'code', type: 'codemirror', language: 'javascript', value: 'let x = 1;' }] });
    const frame = nodes.find((node) => node.tag === 'iframe');
    frame.fire('load');
    assert.match(errors[0].message, /CodeMirror/);
    form.fire('submit');
    assert.equal(submitted.length, 0);
    let options;
    frame.contentDocument = {};
    frame.contentWindow = { createEdyCodeEditor: (config) => { options = config; return { focus() {} }; } };
    frame.fire('load');
    assert.equal(options.language, 'javascript');
    options.onChange('const x = 2;');
    form.fire('submit');
    assert.deepEqual(submitted, [{ code: 'const x = 2;' }]);
    frame.contentDocument = {};
    form.fire('submit');
    assert.equal(submitted.length, 1);
    frame.fire('load');
    assert.equal(options.value, 'const x = 2;');
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'code', type: 'codemirror', language: 'ruby' },
    ] }), /language must be/);
  });
});

test('field hidden CSS overrides its display rules', async () => {
  const css = await readFile(new URL('../src/workbench/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.edy-form__field\[hidden\]\s*\{\s*display:\s*none;/);
});
