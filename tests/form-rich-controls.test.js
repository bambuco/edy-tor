/**
 * @file Tests icon selection and TinyMCE form loading, validation and values.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createForm } from '../src/ui/controls.js';

test('icon and TinyMCE fields report load errors and submit their values', async () => {
  const previous = globalThis.document;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  const nodes = [];
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.listeners = {};
      this.attributes = {};
      this.value = '';
      this.style = {};
      this.offsetHeight = 402;
      this.clientHeight = 400;
      this.isConnected = true;
      nodes.push(this);
    }
    append(...children) { this.children.push(...children); }
    insertBefore(child, reference) { this.children.splice(this.children.indexOf(reference), 0, child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    checkValidity() { return true; }
    focus() {}
    querySelector() { return nodes.find((node) => node.attributes['aria-invalid'] === 'true'); }
  }
  globalThis.document = {
    createElement: (tag) => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
    createTextNode: (text) => ({ textContent: text }),
  };
  try {
    const errors = [];
    const values = [];
    const form = createForm({
      translate: (key) => key,
      onError: (error) => errors.push(error.message),
      onSubmit: (value) => values.push(value),
      fields: [
        { name: 'icon', type: 'icon', value: 'star', options: [
          { value: 'star', label: 'Star', width: 10, height: 10, path: 'M0 0' },
        ] },
        { name: 'html', type: 'tinymce', required: true },
      ],
    });
    const frame = nodes.find((node) => node.tag === 'iframe');
    frame.listeners.load();
    assert.match(errors[0], /Unable to load/);
    form.listeners.submit({ preventDefault() {} });
    assert.equal(values.length, 0);

    const target = {};
    const editorElement = { offsetHeight: 300 };
    let resize;
    let disconnected = false;
    let editorOptions;
    const editor = {
      getContent: () => '<p>Text</p>',
      getBody: () => ({}),
      getContainer: () => editorElement,
      dom: { isEmpty: () => false },
    };
    globalThis.getComputedStyle = () => ({ boxSizing: 'border-box' });
    frame.contentDocument = { querySelector: () => target };
    frame.contentWindow = {
      tinymce: { init: (options) => { editorOptions = options; return Promise.resolve([editor]); } },
      ResizeObserver: class {
        constructor(callback) { resize = callback; }
        observe(element) { assert.equal(element, editorElement); }
        disconnect() { disconnected = true; }
      },
      addEventListener(name, callback) { this[name] = callback; },
    };
    frame.listeners.load();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(editorOptions.toolbar, 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist | link | removeformat');
    assert.equal(editorOptions.menubar, false);
    assert.equal(editorOptions.plugins, 'link lists');
    resize();
    assert.equal(frame.style.height, '302px');
    editorElement.offsetHeight = 540;
    resize();
    assert.equal(frame.style.height, '542px');
    globalThis.getComputedStyle = () => ({ boxSizing: 'content-box' });
    resize();
    assert.equal(frame.style.height, '540px');
    frame.isConnected = false;
    editorElement.offsetHeight = 600;
    resize();
    assert.equal(frame.style.height, '540px');
    frame.isConnected = true;
    form.listeners.submit({ preventDefault() {} });
    assert.deepEqual(values, [{ icon: 'star', html: '<p>Text</p>' }]);
    frame.contentWindow.unload();
    assert.equal(disconnected, true);
  }
  finally {
    globalThis.document = previous;
    globalThis.getComputedStyle = previousGetComputedStyle;
  }
});
