/**
 * @file Tests the reusable host-backed file explorer activity.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFileViewer,
  createFileExplorer,
  FileExplorerProvider,
  registerFileExplorer,
} from '../src/ui/file-explorer.js';

/**
 * Creates a minimal DOM element for the explorer's component tests.
 * @param {string} tagName Element tag.
 * @returns {Object} Mock element.
 */
function createMockElement(tagName) {
  const classes = new Set();
  const element = {
    tagName: tagName.toUpperCase(),
    children: [],
    attributes: new Map(),
    listeners: new Map(),
    dataset: {},
    style: {},
    parentNode: null,
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      contains(name) { return classes.has(name) || element.className?.split(/\s+/u).includes(name); },
    },
    removeAttribute(name) { this.attributes.delete(name); },
    append(...elements) {
      for (const child of elements) {
        child.parentNode = this;
        this.children.push(child);
      }
    },
    prepend(child) {
      child.parentNode = this;
      this.children.unshift(child);
    },
    replaceChildren(...elements) {
      for (const child of this.children) child.parentNode = null;
      this.children = [];
      this.append(...elements);
    },
    remove() {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    },
    contains(target) {
      return this === target || this.children.some((child) => child.contains(target));
    },
    getRootNode() {
      let node = this;
      while (node.parentNode) node = node.parentNode;
      return node;
    },
    getBoundingClientRect() {
      return this.bounds ?? { top: 50, right: 52, bottom: 78, left: 20, width: 32, height: 28 };
    },
    setAttribute(name, value) { this.attributes.set(name, value); },
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    removeEventListener(name) { this.listeners.delete(name); },
    querySelector(selector) {
      return this.children.find((child) => child.tagName?.toLowerCase() === selector) ?? null;
    },
    click() { this.listeners.get('click')?.({ target: this }); },
    focus() {},
    select() {},
    pause() {},
    load() {},
  };
  return element;
}

function createMockDocument() {
  const document = {
    nodeType: 9,
    baseURI: 'https://example.test/',
    listeners: new Map(),
    documentElement: { clientWidth: 800, clientHeight: 600 },
    defaultView: {
      innerWidth: 800,
      innerHeight: 600,
      listeners: new Map(),
      addEventListener(name, callback) { this.listeners.set(name, callback); },
      removeEventListener(name) { this.listeners.delete(name); },
    },
    createElement: createMockElement,
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    removeEventListener(name) { this.listeners.delete(name); },
  };
  document.shadowRoot = createMockElement('shadow-root');
  document.shadowRoot.nodeType = 11;
  document.shadowRoot.ownerDocument = document;
  document.body = createMockElement('body');
  document.body.parentNode = document;
  return document;
}

test('provider defaults reject unimplemented mutations', async () => {
  const provider = new FileExplorerProvider();
  assert.deepEqual(provider.capabilities, {
    createFile: false,
    createFolder: false,
    rename: false,
    delete: false,
    move: false,
    replace: false,
  });
  await assert.rejects(provider.createFolder(null, 'folder'), /not supported/);
});

test('default file viewer accepts only safe URL schemes and supported types', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    baseURI: 'https://example.test/',
    createElement: createMockElement,
  };
  try {
    assert.throws(() => createFileViewer({
      item: { name: 'file.png', type: 'file', mimeType: 'image/png' },
      url: 'javascript:alert(1)',
    }), /must use HTTP, HTTPS, or blob/);
    assert.throws(() => createFileViewer({
      item: { name: 'file.bin', type: 'file', mimeType: 'application/octet-stream' },
      url: 'https://example.test/file.bin',
    }), /application\/octet-stream/);
    const viewer = createFileViewer({
      item: { name: 'file.png', type: 'file', mimeType: 'image/png' },
      url: '/file.png',
    });
    assert.equal(viewer.element.src, 'https://example.test/file.png');
    viewer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('registerFileExplorer contributes a primary activity using the shared view API', () => {
  let registration;
  const resource = { dispose() {} };
  const provider = { list: async () => [], getUrl: async () => '', capabilities: {} };
  const context = {
    translate: (key) => key,
    views: { register: (id, view) => {
      registration = { id, view };
      return resource;
    } },
    documents: { open() {}, activate() { return false; } },
    ui: { confirm: async () => true },
    notifications: { error() {} },
  };
  const result = registerFileExplorer(context, { provider });
  assert.equal(result, resource);
  assert.equal(registration.id, 'files');
  assert.equal(registration.view.location, 'primary');
  assert.equal(registration.view.title, 'files');
  assert.equal(typeof registration.view.render, 'function');
});

test('read-only explorer omits mutation actions and still loads host entries', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    baseURI: 'https://example.test/',
    createElement: createMockElement,
  };
  try {
    const listed = [];
    const provider = {
      capabilities: { createFile: true, createFolder: true, rename: true, delete: true },
      async list(folderId) {
        listed.push(folderId);
        return [{ id: 'one', name: 'Report.pdf', type: 'file', size: 1024 }];
      },
      async getUrl() { return 'https://example.test/report.pdf'; },
      async createFile() {},
      async createFolder() {},
      async rename() {},
      async delete() {},
      async move() {},
      async replace() {},
    };
    const explorer = createFileExplorer({
      provider,
      readOnly: true,
      translate: (key) => key,
      onError: (error) => { throw error; },
    });
    const [toolbar, tree, status] = explorer.element.children;
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(listed, [null]);
    assert.deepEqual(toolbar.children.map((button) => button.attributes.get('aria-label')), ['refresh']);
    assert.equal(tree.children[0].children[0].children[0].textContent, 'Report.pdf');
    assert.equal(status.textContent, '');
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('toolbar is icon-only and operation menus include built-in and custom icons', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = createMockDocument();
  try {
    const explorer = createFileExplorer({
      provider: {
        capabilities: { createFile: true, createFolder: true },
        async list() {
          return [{ id: 'plain', name: 'plain.txt', type: 'file', mimeType: 'text/plain' }];
        },
        async getUrl() { return 'https://example.test/plain.txt'; },
        async createFile() {},
        async createFolder() {},
      },
      operations: { view: true },
      customOperations: [
        { id: 'star', label: 'Star', icon: 'star', execute() {} },
        { id: 'plain-action', label: 'Plain action', execute() {} },
      ],
      translate: (key) => key,
    });
    globalThis.document.shadowRoot.append(explorer.element);
    await new Promise((resolve) => setImmediate(resolve));

    const toolbarButtons = explorer.element.children[0].children;
    assert.deepEqual(toolbarButtons.map((button) => button.attributes.get('aria-label')),
      ['fileAdd', 'folderAdd', 'refresh']);
    assert.ok(toolbarButtons.every((button) => button.textContent === '' && button.title));

    const fileRow = explorer.element.children[1].children[0].children[0];
    const wrapper = fileRow.children.at(-1);
    const trigger = wrapper.children[0];
    trigger.listeners.get('click')({ stopPropagation() {} });
    const menu = globalThis.document.shadowRoot.children.at(-1);
    assert.equal(menu.attributes.get('role'), 'menu');
    assert.deepEqual(menu.children.map((button) => button.textContent),
      ['fileView', 'Star', 'Plain action']);
    assert.ok(menu.children[0].children[0].classList.contains('fa-eye'));
    assert.ok(menu.children[1].children[0].classList.contains('fa-star'));

    menu.listeners.get('keydown')({
      key: 'Escape',
      stopPropagation() {},
    });
    assert.equal(menu.parentNode, null);
    assert.equal(trigger.attributes.get('aria-expanded'), 'false');
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('clicking outside the floating menu closes it and removes dismissal listeners', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = createMockDocument();
  try {
    const explorer = createFileExplorer({
      provider: {
        capabilities: {},
        async list() { return [{ id: 'plain', name: 'plain.txt', type: 'file' }]; },
        async getUrl() { return 'https://example.test/plain.txt'; },
      },
      customOperations: [{ id: 'open', label: 'Open', execute() {} }],
      translate: (key) => key,
    });
    globalThis.document.shadowRoot.append(explorer.element);
    await new Promise((resolve) => setImmediate(resolve));

    const fileRow = explorer.element.children[1].children[0].children[0];
    const trigger = fileRow.children.at(-1).children[0];
    trigger.listeners.get('click')({ stopPropagation() {} });
    const menu = globalThis.document.shadowRoot.children.at(-1);
    globalThis.document.shadowRoot.listeners.get('click')({ target: menu.children[0] });
    assert.equal(menu.parentNode, globalThis.document.shadowRoot);
    const outside = createMockElement('div');
    globalThis.document.shadowRoot.append(outside);
    globalThis.document.shadowRoot.listeners.get('click')({ target: outside });

    assert.equal(menu.parentNode, null);
    assert.equal(trigger.attributes.get('aria-expanded'), 'false');
    assert.equal(globalThis.document.shadowRoot.listeners.has('click'), false);
    assert.equal(globalThis.document.defaultView.listeners.has('resize'), false);
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('upload policy rejects disallowed types and oversized files before provider calls', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    baseURI: 'https://example.test/',
    createElement: createMockElement,
  };
  try {
    const errors = [];
    let uploads = 0;
    const explorer = createFileExplorer({
      provider: {
        capabilities: { createFile: true },
        async list() { return []; },
        async getUrl() { return 'https://example.test/file'; },
        async createFile() { uploads++; },
      },
      translate: (key) => ({
        fileTypeNotAllowed: '"{name}" has a file type that is not allowed.',
        fileTooLarge: '"{name}" exceeds the configured file size limit.',
      })[key] ?? key,
      accept: ['image/*'],
      maxFileSize: 1024,
      onError: (error) => errors.push(error.message),
    });
    const fileInput = explorer.element.children[3];
    fileInput.files = [{ name: 'notes.pdf', type: 'application/pdf', size: 20 }];
    await fileInput.listeners.get('change')({ target: fileInput });
    fileInput.files = [{ name: 'large.png', type: 'image/png', size: 2048 }];
    await fileInput.listeners.get('change')({ target: fileInput });
    assert.equal(uploads, 0);
    assert.deepEqual(errors, ['"notes.pdf" has a file type that is not allowed.',
      '"large.png" exceeds the configured file size limit.']);
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('double-click views a supported file in the configured editor destination', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    baseURI: 'https://example.test/',
    createElement: createMockElement,
  };
  try {
    let viewer;
    const explorer = createFileExplorer({
      provider: {
        capabilities: {},
        async list() {
          return [{ id: 'image', name: 'image.png', type: 'file', mimeType: 'image/png' }];
        },
        async getUrl() { return 'https://example.test/image.png'; },
      },
      operations: { view: true },
      openInEditor: async ({ render }) => { viewer = render(); },
      translate: (key) => key,
      onError: (error) => { throw error; },
    });
    await new Promise((resolve) => setImmediate(resolve));
    const nameButton = explorer.element.children[1].children[0].children[0].children[0];
    await nameButton.listeners.get('dblclick')();
    assert.equal(viewer.element.tagName, 'IMG');
    viewer.dispose();
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('double-click after open-on-click delegates only once when view is disabled', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    baseURI: 'https://example.test/',
    createElement: createMockElement,
  };
  try {
    let urlRequests = 0;
    const explorer = createFileExplorer({
      provider: {
        capabilities: {},
        async list() { return [{ id: 'plain', name: 'plain.bin', type: 'file' }]; },
        async getUrl() {
          urlRequests++;
          return 'https://example.test/plain.bin';
        },
      },
      clickBehavior: 'open',
      onOpen: () => 'host',
      translate: (key) => key,
    });
    await new Promise((resolve) => setImmediate(resolve));
    const nameButton = explorer.element.children[1].children[0].children[0].children[0];
    nameButton.listeners.get('click')();
    nameButton.listeners.get('click')();
    nameButton.listeners.get('dblclick')();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(urlRequests, 1);
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('drag-and-drop moves an entry into an expanded-tree folder and refreshes both caches', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    baseURI: 'https://example.test/',
    createElement: createMockElement,
  };
  try {
    const folders = new Map([
      [null, [
        { id: 'folder', name: 'folder', type: 'folder' },
        { id: 'file', name: 'file.txt', type: 'file' },
      ]],
      ['folder', []],
    ]);
    const moves = [];
    const explorer = createFileExplorer({
      provider: {
        capabilities: { move: true },
        async list(folderId) { return folders.get(folderId); },
        async getUrl() { return 'https://example.test/file'; },
        async move(id, destinationFolderId) {
          moves.push([id, destinationFolderId]);
          folders.set(null, folders.get(null).filter((entry) => entry.id !== id));
          folders.set(destinationFolderId, [...folders.get(destinationFolderId), {
            id, name: 'file.txt', type: 'file',
          }]);
        },
      },
      translate: (key) => key,
      onError: (error) => { throw error; },
    });
    await new Promise((resolve) => setImmediate(resolve));
    const folderItem = explorer.element.children[1].children[0];
    folderItem.listeners.get('drop')({
      preventDefault() {},
      stopPropagation() {},
      dataTransfer: { getData: () => 'file' },
    });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(moves, [['file', 'folder']]);
    assert.deepEqual(folders.get(null).map((entry) => entry.id), ['folder']);
    assert.deepEqual(folders.get('folder').map((entry) => entry.id), ['file']);
    explorer.dispose();
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('file explorer rejects invalid provider and policy configuration', () => {
  const provider = { list: async () => [], getUrl: async () => '', capabilities: {} };
  assert.throws(() => createFileExplorer({ provider, operations: { upload: true } }), /Invalid file explorer options/);
  assert.throws(() => createFileExplorer({ provider, maxFileSize: 0 }), /Invalid file explorer options/);
  assert.throws(() => createFileExplorer({ provider: {}, readOnly: true }), /must implement list/);
  assert.throws(() => createFileExplorer({ provider: new FileExplorerProvider(), readOnly: true }), /must implement list/);
});
