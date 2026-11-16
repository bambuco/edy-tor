/**
 * @file Tests workbench interaction state and activity-bar selection behavior.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { Workbench } from '../src/workbench/workbench.js';
import { createEdy } from '../src/core/instance.js';

test('invalid logo options are rejected before mounting', () => {
  const container = { attachShadow() {} };
  for (const logo of ['', '  ', null, 123, {}]) {
    assert.throws(() => createEdy({ container, logo }), /logo must be a non-empty image URL string/);
  }
});

test('invalid custom stylesheet options are rejected before mounting', () => {
  const container = {
    ownerDocument: { baseURI: 'https://example.test/app/' },
    attachShadow() { throw new Error('Should not mount'); },
  };
  for (const customCss of ['', '  ', null, 123, {}]) {
    assert.throws(() => createEdy({ container, customCss }), /customCss must be a non-empty stylesheet URL string/);
  }
  assert.throws(() => createEdy({ container, customCss: 'http://[' }), TypeError);
});

test('invalid initial workbench state is rejected before mounting', () => {
  const container = { attachShadow() { throw new Error('Should not mount'); } };
  for (const initialState of [null, [], 'invalid', { unknown: true }]) {
    assert.throws(() => createEdy({ container, initialState }), /initialState must be an object/);
  }
  for (const initialState of [
    { bottomPanel: { visible: 'false' } },
    { primarySidebar: { title: '  ' } },
    { preview: { visible: 1 } },
    { showPanelVisibilityInMenu: 'false' },
  ]) {
    assert.throws(() => createEdy({ container, initialState }), /initialState\./);
  }
});

test('custom stylesheets resolve per instance, report failures and are removed on disposal', async () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousRender = Workbench.prototype.render;
  const previousRenderNotifications = Workbench.prototype.renderNotifications;
  const previousError = console.error;
  class Element extends EventTarget {
    constructor(tagName) {
      super();
      this.tagName = tagName;
      this.childNodes = [];
      this.attributes = new Map();
      this.classList = { remove() {} };
    }
    append(element) { this.childNodes.push(element); }
    replaceChildren(...elements) { this.childNodes = elements; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    querySelector(selector) {
      if (selector === 'link[data-edy-fontawesome-fonts]') {
        return this.childNodes.find((child) => child.attributes.has('data-edy-fontawesome-fonts')) ?? null;
      }
      return null;
    }
  }
  const document = { baseURI: 'https://example.test/base/path/', head: new Element('head') };
  document.createElement = (tagName) => new Element(tagName);
  const container = () => {
    const element = new Element('host');
    element.ownerDocument = document;
    element.attachShadow = () => {
      element.shadowRoot = new Element('shadow');
      element.shadowRoot.ownerDocument = document;
      return element.shadowRoot;
    };
    return element;
  };
  const errors = [];
  globalThis.document = document;
  globalThis.window = { removeEventListener() {} };
  Workbench.prototype.render = () => {};
  Workbench.prototype.renderNotifications = () => {};
  console.error = (...args) => errors.push(args);
  try {
    const firstHost = container();
    const first = createEdy({ container: firstHost, locale: 'es', customCss: '../custom.css' });
    const second = createEdy({ container: container(), customCss: '/theme.css' });
    const third = createEdy({ container: container(), customCss: 'https://cdn.example.test/theme.css' });
    const fourth = createEdy({ container: container() });
    const configured = createEdy({
      container: container(),
      initialState: {
        bottomPanel: { visible: false, title: 'Console' },
        preview: { visible: true },
        showPanelVisibilityInMenu: false,
      },
    });
    assert.equal(first.customCss, 'https://example.test/base/custom.css');
    assert.equal(second.customCss, 'https://example.test/theme.css');
    assert.equal(third.customCss, 'https://cdn.example.test/theme.css');
    assert.equal(fourth.customCss, undefined);
    assert.equal(configured.workbench.panelVisible, false);
    assert.equal(configured.workbench.previewVisible, true);
    assert.equal(configured.workbench.instance.initialState.bottomPanel.title, 'Console');
    assert.equal(configured.workbench.instance.initialState.showPanelVisibilityInMenu, false);
    assert.deepEqual(first.shadow.childNodes.map((child) => child.tagName), ['link', 'link', 'link', 'div']);
    const customLink = first.shadow.childNodes[2];
    assert.equal(customLink.href, first.customCss);
    assert.equal(customLink.rel, 'stylesheet');
    assert.equal(fourth.shadow.childNodes.filter((child) => child.tagName === 'link').length, 2);
    const pendingLink = second.workbench.customStylesheet;

    customLink.dispatchEvent(new Event('error'));
    assert.equal(errors.length, 1);
    assert.match(first.notices[0].message, /No se pudo cargar la hoja de estilos personalizada/);
    assert.match(first.notices[0].message, /https:\/\/example\.test\/base\/custom\.css/);
    customLink.dispatchEvent(new Event('error'));
    assert.equal(errors.length, 1);

    await Promise.all([first.dispose(), second.dispose(), third.dispose(), fourth.dispose(), configured.dispose()]);
    assert.equal(first.shadow.childNodes.length, 0);
    const remounted = createEdy({ container: firstHost });
    assert.equal(remounted.shadow.childNodes.filter((child) => child.tagName === 'link').length, 2);
    customLink.dispatchEvent(new Event('error'));
    pendingLink.dispatchEvent(new Event('error'));
    assert.equal(errors.length, 1);
    await remounted.dispose();
  }
  finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    Workbench.prototype.render = previousRender;
    Workbench.prototype.renderNotifications = previousRenderNotifications;
    console.error = previousError;
  }
});

test('theme is applied to both the workbench and the dialog host', () => {
  const attributes = new Map();
  const workbench = Object.create(Workbench.prototype);
  workbench.instance = {
    theme: 'dark',
    container: { setAttribute: (name, value) => attributes.set(name, value) },
  };
  const layout = { dataset: {} };
  workbench.applyTheme(layout);
  assert.equal(layout.dataset.theme, 'dark');
  assert.equal(attributes.get('data-edy-theme'), 'dark');
  workbench.instance.theme = 'light';
  workbench.applyTheme(layout);
  assert.equal(layout.dataset.theme, 'light');
  assert.equal(attributes.get('data-edy-theme'), 'light');
});

test('view menu groups panel toggles and reflects their visibility state', () => {
  const previousDocument = globalThis.document;
  class Element {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.attributes = new Map();
      this.dataset = {};
      this.style = {};
      this.classList = {
        add: (...names) => names.forEach((name) => {
          this.classes ??= new Set();
          this.classes.add(name);
        }),
      };
    }
    append(...elements) { this.children.push(...elements); }
    prepend(element) { this.children.unshift(element); }
    replaceChildren(...elements) { this.children = elements; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    addEventListener() {}
  }
  globalThis.document = { createElement: (tagName) => new Element(tagName) };
  try {
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = {
      translate: (key) => ({
        view: 'Ver',
        help: 'Ayuda',
        panels: 'Paneles',
        togglePrimary: 'Barra lateral principal',
        toggleSecondary: 'Barra lateral secundaria',
        togglePanel: 'Panel inferior',
        about: 'Acerca de Edy',
      })[key] ?? key,
      initialState: { showPanelVisibilityInMenu: true },
      menus: { entries: () => [] },
    };
    workbench.primaryVisible = true;
    workbench.secondaryVisible = false;
    workbench.panelVisible = true;
    workbench.openMenu = 'view';
    const menuBar = new Element('nav');
    workbench.renderMenus(menuBar);

    const viewMenu = menuBar.children.find((wrapper) => wrapper.children[0].textContent === 'Ver');
    const panelPopup = viewMenu.children[1];
    const panelSubmenu = panelPopup.children[0].children[1];
    const panelItems = panelSubmenu.children;
    assert.deepEqual(panelItems.map((item) => item.getAttribute('aria-checked')), ['true', 'false', 'true']);
    assert.deepEqual(panelItems.map((item) => item.children[1].textContent), [
      'Barra lateral principal',
      'Barra lateral secundaria',
      'Panel inferior',
    ]);
    assert.equal(panelItems[0].children[0].style.visibility, 'visible');
    assert.equal(panelItems[1].children[0].style.visibility, 'hidden');
    assert.ok(panelItems.every((item) => item.getAttribute('role') === 'menuitemcheckbox'));
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('view menu can omit built-in panel visibility controls', () => {
  const previousDocument = globalThis.document;
  class Element {
    constructor() {
      this.children = [];
      this.dataset = {};
      this.classList = { add() {} };
    }
    append(...elements) { this.children.push(...elements); }
    setAttribute() {}
    replaceChildren(...elements) { this.children = elements; }
  }
  globalThis.document = { createElement: () => new Element() };
  try {
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = {
      translate: (key) => key,
      initialState: { showPanelVisibilityInMenu: false },
      menus: { entries: () => [] },
    };
    workbench.primaryVisible = true;
    workbench.secondaryVisible = true;
    workbench.panelVisible = true;
    workbench.openMenu = null;
    const menuBar = new Element();
    workbench.renderMenus(menuBar);
    assert.deepEqual(menuBar.children.map((wrapper) => wrapper.children[0].textContent), ['help']);
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('configured panel titles label empty regions without replacing active view titles', () => {
  const previousDocument = globalThis.document;
  class Element {
    constructor() {
      this.children = [];
      this.attributes = new Map();
      this.dataset = {};
      this.classList = { add() {} };
    }
    append(...elements) { this.children.push(...elements); }
    setAttribute(name, value) { this.attributes.set(name, value); }
  }
  globalThis.document = { createElement: () => new Element() };
  try {
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = {
      initialState: { bottomPanel: { title: 'Console' } },
      views: { entries: () => [] },
      translate: (key) => key,
    };
    const pane = workbench.renderPane('panel', 'Default panel', null);
    assert.equal(pane.attributes.get('aria-label'), 'Console');
    assert.equal(pane.children[0].children[0].textContent, 'Console');
  }
  finally {
    globalThis.document = previousDocument;
  }
});

test('activity and openView update only the primary pane and preserve other contributions', () => {
  const previousDocument = globalThis.document;
  const previousNode = globalThis.Node;
  class Element {
    constructor() {
      this.children = [];
      this.parent = null;
      this.attributes = new Map();
      this.dataset = {};
      this.classes = new Set();
      this.classList = {
        add: (name) => this.classes.add(name),
        toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      };
      this.style = { setProperty() {} };
    }
    append(...elements) {
      for (const element of elements) {
        if (element instanceof Fragment) {
          this.append(...element.children.slice());
          continue;
        }
        if (element.parent) {
          element.parent.children.splice(element.parent.children.indexOf(element), 1);
        }
        element.parent = this;
        this.children.push(element);
      }
    }
    replaceWith(element) {
      const parent = this.parent;
      const index = parent.children.indexOf(this);
      parent.children[index] = element;
      element.parent = parent;
      this.parent = null;
    }
    contains(element) {
      return this === element || this.children.some((child) => child.contains(element));
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name); }
    closest() { return this; }
    querySelector(selector) {
      if (selector === '.edy-pane--primary') {
        return this.children.find((child) => child.className === 'edy-pane edy-pane--primary') ?? null;
      }
      if (selector === '.edy-menubar [data-action="toggle-primary"]') return this.menuItem ?? null;
      if (selector === '.edy-menu__check') return this.check ?? null;
      return null;
    }
    querySelectorAll() { return this.buttons ?? []; }
  }
  class Fragment extends Element {}
  globalThis.Node = Element;
  globalThis.document = { createElement: () => new Element() };
  try {
    const renders = { first: 0, second: 0 };
    const disposals = { first: 0, second: 0, editor: 0, preview: 0, viewport: 0 };
    const primary = (id) => ({
      location: 'primary',
      title: id,
      render() {
        renders[id]++;
        return { element: new Element(), dispose: () => disposals[id]++ };
      },
    });
    const views = new Map([['first', primary('first')], ['second', primary('second')]]);
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = {
      views: { entries: () => [...views], get: (id) => views.get(id) },
      translate: (key) => key,
      reportError: (error) => { throw error; },
    };
    workbench.activePrimary = null;
    workbench.primaryVisible = true;
    workbench.secondaryVisible = true;
    workbench.panelVisible = true;
    workbench.contributionCache = new Map();
    workbench.renderedContributions = new Set();
    workbench.previewViewport = { dispose: () => disposals.viewport++ };
    workbench.layout = new Element();
    workbench.shadow = { contains: () => true };
    workbench.render = () => { throw new Error('Full workbench render is not expected'); };
    const buttons = ['first', 'second'].map((id) => {
      const button = new Element();
      button.dataset = { action: 'toggle-primary-view', id };
      return button;
    });
    workbench.layout.buttons = buttons;
    workbench.layout.menuItem = new Element();
    workbench.layout.menuItem.check = new Element();
    const editor = new Element();
    const preview = new Element();
    const editorContribution = { title: 'editor', render: () => ({
      element: new Element(), dispose: () => disposals.editor++,
    }) };
    const previewContribution = { title: 'preview', render: () => ({
      element: new Element(), dispose: () => disposals.preview++,
    }) };
    workbench.layout.append(workbench.renderPane('primary', 'primarySidebar', null), editor, preview);
    workbench.renderContribution(editor, editorContribution);
    workbench.renderContribution(preview, previewContribution);
    const editorContent = editor.children[0];
    const previewContent = preview.children[0];
    const initialPane = workbench.layout.children[0];
    const click = (button) => workbench.handleClick({ target: button });

    workbench.updateLayout();
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
    click(buttons[0]);
    assert.equal(workbench.layout.classes.has('is-primary-hidden'), true);
    assert.equal(workbench.layout.menuItem.getAttribute('aria-checked'), 'false');
    assert.equal(workbench.layout.menuItem.check.style.visibility, 'hidden');
    click(buttons[0]);
    assert.equal(workbench.layout.children[0], initialPane);
    assert.equal(workbench.layout.menuItem.getAttribute('aria-checked'), 'true');
    assert.equal(workbench.layout.menuItem.check.style.visibility, 'visible');
    assert.deepEqual(renders, { first: 1, second: 0 });

    click(buttons[1]);
    assert.equal(workbench.activePrimary, 'second');
    assert.notEqual(workbench.layout.children[0], initialPane);
    assert.equal(workbench.layout.children[0].children[0].children[0].textContent, 'second');
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    assert.deepEqual(disposals, { first: 1, second: 0, editor: 0, preview: 0, viewport: 0 });
    workbench.openView('second');
    click(buttons[1]);
    workbench.openView('second');
    assert.equal(workbench.primaryVisible, true);
    assert.deepEqual(renders, { first: 1, second: 1 });
    assert.equal(workbench.layout.children[1], editor);
    assert.equal(workbench.layout.children[2], preview);
    assert.equal(editor.children[0], editorContent);
    assert.equal(preview.children[0], previewContent);
    workbench.openView('first');
    assert.deepEqual(renders, { first: 2, second: 1 });
    assert.deepEqual(disposals, { first: 1, second: 1, editor: 0, preview: 0, viewport: 0 });
    click(buttons[0]);
    click(buttons[1]);
    assert.equal(workbench.primaryVisible, true);
    assert.equal(workbench.layout.children[0].children[0].children[0].textContent, 'second');
    workbench.openView('first');

    let fragmentDisposals = 0;
    views.set('fragment', {
      location: 'primary',
      title: 'fragment',
      render() {
        const element = new Fragment();
        element.append(new Element());
        return { element, dispose: () => fragmentDisposals++ };
      },
    });
    workbench.openView('fragment');
    workbench.openView('second');
    assert.equal(fragmentDisposals, 1);
    workbench.activeEditorContribution = views.get('second');
    workbench.renderContribution(editor, workbench.activeEditorContribution);
    const secondDisposals = disposals.second;
    workbench.openView('first');
    assert.equal(disposals.second, secondDisposals);
    assert.equal(workbench.contributionCache.has(workbench.activeEditorContribution), true);
    assert.throws(() => workbench.openView('missing'), /not registered/);
  }
  finally {
    globalThis.document = previousDocument;
    globalThis.Node = previousNode;
  }
});
