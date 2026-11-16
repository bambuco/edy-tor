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
    assert.equal(first.customCss, 'https://example.test/base/custom.css');
    assert.equal(second.customCss, 'https://example.test/theme.css');
    assert.equal(third.customCss, 'https://cdn.example.test/theme.css');
    assert.equal(fourth.customCss, undefined);
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

    await Promise.all([first.dispose(), second.dispose(), third.dispose(), fourth.dispose()]);
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

test('activity buttons toggle the selected primary view without changing openView semantics', () => {
  const views = new Map([
    ['first', { location: 'primary' }],
    ['second', { location: 'primary' }],
  ]);
  const workbench = Object.create(Workbench.prototype);
  workbench.instance = { views: { entries: () => [...views], get: (id) => views.get(id) } };
  workbench.activePrimary = null;
  workbench.primaryVisible = true;
  workbench.secondaryVisible = true;
  workbench.panelVisible = true;
  const hiddenClasses = new Set();
  const buttons = ['first', 'second'].map((id) => ({
    dataset: { action: 'toggle-primary-view', id },
    setAttribute(name, value) { this[name] = value; },
    closest() { return this; },
  }));
  workbench.shadow = { contains: () => true };
  workbench.layout = {
    classList: {
      toggle(name, enabled) {
        if (enabled) hiddenClasses.add(name);
        else hiddenClasses.delete(name);
      },
    },
    style: { setProperty() {} },
    querySelectorAll: () => buttons,
  };
  workbench.render = () => workbench.updateLayout();
  const click = (button) => workbench.handleClick({ target: button });

  workbench.updateLayout();
  assert.equal(buttons[0]['aria-pressed'], 'true');
  click(buttons[0]);
  assert.equal(workbench.primaryVisible, false);
  assert.equal(hiddenClasses.has('is-primary-hidden'), true);
  assert.equal(buttons[0]['aria-pressed'], 'false');
  click(buttons[0]);
  assert.equal(workbench.primaryVisible, true);
  assert.equal(buttons[0]['aria-pressed'], 'true');
  click(buttons[1]);
  assert.equal(workbench.activePrimary, 'second');
  assert.equal(buttons[0]['aria-pressed'], 'false');
  assert.equal(buttons[1]['aria-pressed'], 'true');
  workbench.openView('second');
  assert.equal(workbench.primaryVisible, true);
  click(buttons[1]);
  assert.equal(workbench.primaryVisible, false);
  workbench.openView('second');
  assert.equal(workbench.primaryVisible, true);
  assert.equal(buttons[1]['aria-pressed'], 'true');
});
