/**
 * @file Tests the host asset selector contract and async lifecycle.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { createForm } from '../src/ui/controls.js';

async function withDocument(run) {
  const previous = globalThis.document;
  const nodes = [];
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.attributes = {};
      this.listeners = {};
      this.value = '';
      this.isConnected = true;
      this.classList = { add() {} };
      nodes.push(this);
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    checkValidity() { return true; }
    focus() { this.focused = true; }
    fire(name) { return this.listeners[name]?.({ preventDefault() {} }); }
  }
  globalThis.document = {
    baseURI: 'https://host.example/',
    createElement: (tag) => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
  };
  try { await run(nodes); }
  finally { globalThis.document = previous; }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

const image = { id: 'img-1', name: 'Image', mimeType: 'image/png' };

test('asset picker submits IDs, preserves cancellation, and validates selection and errors', async () => {
  await withDocument(async (nodes) => {
    const submitted = [];
    const errors = [];
    const requests = [];
    let response = deferred();
    const form = createForm({ translate: (key) => key, onError: (error) => errors.push(error),
      onSubmit: (values) => submitted.push(values), fields: [
        { name: 'file', type: 'asset', required: true, accept: ['image/*'], value: ['old'],
          pick: (request) => { requests.push(request); return response.promise; } },
      ] });
    const choose = nodes.find((node) => node.textContent === 'assetChoose');
    const clear = nodes.find((node) => node.textContent === 'assetClear');
    let pending = choose.fire('click');
    assert.deepEqual(requests[0].currentValue, ['old']);
    assert.deepEqual(requests[0].accept, ['image/*']);
    assert.equal(requests[0].multiple, false);
    form.fire('submit');
    assert.equal(submitted.length, 0);
    response.resolve(null);
    await pending;
    form.fire('submit');
    assert.deepEqual(submitted.at(-1), { file: ['old'] });
    response = deferred();
    pending = choose.fire('click');
    response.resolve([image]);
    await pending;
    form.fire('submit');
    assert.deepEqual(submitted.at(-1), { file: ['img-1'] });
    assert.equal(nodes.find((node) => node.textContent === 'Image').textContent, 'Image');
    response = deferred();
    pending = choose.fire('click');
    response.resolve([image, image]);
    await pending;
    assert.match(errors[0].message, /unique records/);
    form.fire('submit');
    assert.equal(submitted.length, 2);
    response = deferred();
    pending = choose.fire('click');
    response.reject(new Error('host unavailable'));
    await pending;
    assert.match(errors[1].message, /host unavailable/);
    clear.fire('click');
    form.fire('submit');
    assert.equal(submitted.length, 2);
    assert.equal(choose.attributes['aria-invalid'], 'true');
  });
});

test('previews resolve lazily, release resources, and do not change submitted IDs', async () => {
    await withDocument(async (nodes) => {
      const requests = [];
      const submitted = [];
      const errors = [];
      let response = deferred();
      let released = 0;
      const form = createForm({ translate: (key) => key, onSubmit: (value) => submitted.push(value),
        onError: (error) => errors.push(error), fields: [
          { name: 'file', type: 'asset', value: ['img-1'], pick: async () => null,
            resolvePreview: (request) => { requests.push(request); return response.promise; } },
        ] });
      const button = nodes.find((node) => node.attributes['aria-label'] === 'assetPreview: img-1');
      let pending = button.fire('click');
      assert.equal(requests[0].id, 'img-1');
      response.resolve({ url: 'https://host.example/image.png', mimeType: 'image/png', dispose: () => released++ });
      await pending;
      const img = nodes.find((node) => node.tag === 'img');
      assert.equal(img.src, 'https://host.example/image.png');
      assert.equal(img.alt, 'img-1');
      form.fire('submit');
      assert.deepEqual(submitted[0], { file: ['img-1'] });
      response = deferred();
      pending = button.fire('click');
      assert.equal(released, 1);
      const close = nodes.filter((node) => node.textContent === 'assetPreviewClose').at(-1);
      close.fire('click');
      assert.equal(requests[1].signal.aborted, true);
      response.resolve({ url: 'blob:https://host.example/123', mimeType: 'image/png', dispose: () => released++ });
      await pending;
      assert.equal(released, 2);
      response = deferred();
      pending = button.fire('click');
      response.resolve({ url: 'javascript:alert(1)', mimeType: 'image/png', dispose: () => released++ });
      await pending;
      assert.equal(released, 3);
      assert.match(errors[0].message, /URL must use/);
      response = deferred();
      pending = button.fire('click');
      response.resolve({ url: '/file.html', mimeType: 'text/html', dispose: () => released++ });
      await pending;
      assert.equal(released, 4);
      assert.equal(nodes.filter((node) => node.textContent === 'assetPreviewUnsupported').length, 1);
      response = deferred();
      pending = button.fire('click');
      response.resolve({ url: '/file.pdf', mimeType: 'application/pdf', dispose: () => released++ });
      await pending;
      const iframe = nodes.find((node) => node.tag === 'iframe');
      assert.equal(iframe.attributes.sandbox, '');
      assert.equal(iframe.attributes.referrerpolicy, 'no-referrer');
      form.dispose();
      assert.equal(released, 5);
  });
});

test('multiple selection, hide and disposal abort pending requests without applying stale results', async () => {
  await withDocument(async (nodes) => {
    const submitted = [];
    const requests = [];
    let response = deferred();
    const form = createForm({ translate: (key) => key, onError: assert.fail,
      onSubmit: (value) => submitted.push(value), fields: [
        { name: 'show', type: 'checkbox', value: true },
        { name: 'files', type: 'asset', multiple: true, visibleWhen: { field: 'show', equals: true },
          pick: (request) => { requests.push(request); return response.promise; } },
      ] });
    const show = nodes.find((node) => node.name === 'show');
    const choose = nodes.find((node) => node.textContent === 'assetChoose');
    let pending = choose.fire('click');
    assert.equal(requests[0].multiple, true);
    response.resolve([image, { id: 'img-2', name: 'Other', mimeType: 'image/jpeg' }]);
    await pending;
    form.fire('submit');
    assert.deepEqual(submitted.at(-1).files, ['img-1', 'img-2']);
    response = deferred();
    pending = choose.fire('click');
    show.checked = false;
    show.fire('input');
    assert.equal(requests[1].signal.aborted, true);
    response.resolve([]);
    await pending;
    show.checked = true;
    show.fire('input');
    form.fire('submit');
    assert.deepEqual(submitted.at(-1).files, ['img-1', 'img-2']);
    response = deferred();
    pending = choose.fire('click');
    form.dispose();
    assert.equal(requests[2].signal.aborted, true);
    response.resolve([]);
    await pending;
    assert.throws(() => createForm({ translate: (key) => key, onSubmit() {}, fields: [
      { name: 'bad', type: 'asset', pick() {}, value: ['a', 'b'] },
    ] }), /array of unique IDs/);
  });
});

test('empty confirmation clears values and feeds visibility dependencies', async () => {
  await withDocument(async (nodes) => {
    const response = deferred();
    const submitted = [];
    const form = createForm({ translate: (key) => key, onSubmit: (value) => submitted.push(value), fields: [
      { name: 'file', type: 'asset', value: ['old'], allowClear: false, pick: () => response.promise },
      { name: 'caption', value: 'caption', visibleWhen: (values) => values.file.length > 0 },
    ] });
    const choose = nodes.find((node) => node.textContent === 'assetChoose');
    const clear = nodes.find((node) => node.textContent === 'assetClear');
    assert.equal(clear.hidden, true);
    const pending = choose.fire('click');
    response.resolve([]);
    await pending;
    form.fire('submit');
    assert.deepEqual(submitted, [{ file: [] }]);
  });
});

test('audio and video previews use native controls and report resolution errors', async () => {
  await withDocument(async (nodes) => {
    let response = { url: '/sound.mp3', mimeType: 'audio/mpeg' };
    const errors = [];
    const form = createForm({ translate: (key) => key, onSubmit() {}, onError: (error) => errors.push(error), fields: [
      { name: 'file', type: 'asset', value: ['asset'], pick: async () => null,
        resolvePreview: async () => {
          if (response instanceof Error) throw response;
          return response;
        } },
    ] });
    const button = nodes.find((node) => node.attributes['aria-label'] === 'assetPreview: asset');
    await button.fire('click');
    assert.equal(nodes.find((node) => node.tag === 'audio').controls, true);
    response = { url: '/video.webm', mimeType: 'video/webm' };
    await button.fire('click');
    const video = nodes.find((node) => node.tag === 'video');
    assert.equal(video.controls, true);
    video.fire('error');
    assert.match(errors[0].message, /Unable to load preview/);
    response = new Error('not authorized');
    await button.fire('click');
    assert.equal(errors[1].message, 'not authorized');
    form.dispose();
  });
});
