/**
 * @file Tests editor breadcrumb state, rendering, actions, and cleanup.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { EdyInstance } from '../src/core/instance.js';
import { DisposableStore, Registry } from '../src/core/registry.js';
import { Workbench } from '../src/workbench/workbench.js';

function createInstance() {
  const instance = Object.create(EdyInstance.prototype);
  instance.breadcrumbs = { view: new Map(), document: new Map() };
  instance.views = new Registry(() => instance.pruneBreadcrumbs('view'));
  instance.documents = new Registry(() => instance.pruneBreadcrumbs('document'));
  instance.workbench = { refreshBreadcrumbs() { this.refreshes = (this.refreshes ?? 0) + 1; } };
  instance.services = {};
  instance.locale = 'en';
  instance.translate = (key) => key;
  return instance;
}

function createContext(instance, id) {
  const store = new DisposableStore();
  return { store, context: instance.createExtensionContext({ id }, store, []) };
}

test('breadcrumb paths validate, isolate, replace and clean up with their contributions', async () => {
  const instance = createInstance();
  const { context, store } = createContext(instance, 'first');
  const other = createContext(instance, 'second');
  context.views.register('view', { title: 'View', location: 'editor' });
  context.views.register('sidebar', { title: 'Sidebar', location: 'primary' });
  other.context.views.register('view', { title: 'Other', location: 'editor' });
  const target = { type: 'view', id: 'view' };
  const item = { id: 'one', label: 'One', icon: 'file', onSelect() {} };
  context.breadcrumbs.set(target, [item]);
  item.label = 'Changed outside';
  assert.equal(instance.breadcrumbs.view.get('first:view').items[0].label, 'One');
  other.context.breadcrumbs.set(target, [{ ...item, label: 'Other' }]);
  assert.equal(instance.breadcrumbs.view.get('second:view').items[0].label, 'Other');
  assert.throws(() => context.breadcrumbs.set({ type: 'view', id: 'sidebar' }, [item]), /not registered/);
  assert.throws(() => context.breadcrumbs.set({ type: 'view', id: 'missing' }, [item]), /not registered/);
  assert.throws(() => context.breadcrumbs.set({ type: 'preview', id: 'view' }, [item]), /view or document/);
  assert.throws(() => context.breadcrumbs.set(target, {}), /array/);
  assert.throws(() => context.breadcrumbs.set(target, [{ ...item, onSelect: null }]), /onSelect/);
  assert.throws(() => context.breadcrumbs.set(target, [item, item]), /duplicated/);
  assert.throws(() => context.breadcrumbs.set(target, [{ ...item, icon: null }]), /icons/);
  assert.equal(instance.breadcrumbs.view.get('first:view').items[0].label, 'One');
  context.breadcrumbs.set(target, []);
  assert.equal(instance.breadcrumbs.view.has('first:view'), false);
  context.breadcrumbs.set(target, [item]);
  context.breadcrumbs.clear(target);
  assert.equal(instance.breadcrumbs.view.has('first:view'), false);
  context.breadcrumbs.set(target, [item]);
  await store.dispose();
  assert.equal(instance.breadcrumbs.view.has('first:view'), false);
  assert.equal(instance.breadcrumbs.view.has('second:view'), true);
  assert.throws(() => context.breadcrumbs.set(target, [item]), /disposed/);
  await other.store.dispose();
});

test('closed documents discard paths and reopened documents start with an empty path', () => {
  const instance = createInstance();
  instance.workbench.openDocument = () => {};
  const { context } = createContext(instance, 'first');
  const target = { type: 'document', id: 'page' };
  const path = [{ id: 'page', label: 'Page', onSelect() {} }];
  context.documents.open('page', { title: 'Page' });
  context.breadcrumbs.set(target, path);
  context.documents.close('page');
  assert.equal(instance.breadcrumbs.document.size, 0);
  assert.throws(() => context.breadcrumbs.set(target, path), /not registered/);
  context.documents.close('page');
  assert.throws(() => context.documents.open('page', { title: 'Page', icon: null }), /Document icons/);
  context.documents.open('page', { title: 'New page' });
  assert.equal(instance.breadcrumbs.document.size, 0);
});

test('document activation focuses an existing document without registering another one', () => {
  const instance = createInstance();
  const opened = [];
  instance.workbench.openDocument = (id) => opened.push(id);
  const { context } = createContext(instance, 'first');
  assert.equal(context.documents.activate('page'), false);
  context.documents.open('page', { title: 'Page' });
  assert.equal(context.documents.activate('page'), true);
  assert.deepEqual(opened, ['first:page', 'first:page']);
});

function withDocument(run) {
  const previous = globalThis.document;
  const shadow = { activeElement: null };
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.classList = { add() {}, toggle() {} };
      this.listeners = {};
    }
    append(...children) { this.children.push(...children); }
    contains(child) { return this === child || this.children.some((node) => node.contains?.(child)); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    replaceChildren(...children) {
      if (this.contains(shadow.activeElement)) shadow.activeElement = null;
      this.children = children;
    }
    querySelectorAll(tag) {
      return this.children.flatMap((child) =>
        [...(child.tag === tag ? [child] : []), ...(child.querySelectorAll?.(tag) ?? [])]);
    }
    focus() { shadow.activeElement = this; }
  }
  globalThis.document = { createElement: (tag) => new Element(tag) };
  return Promise.resolve().then(() => run({ shadow, Element })).finally(() => {
    globalThis.document = previous;
  });
}

test('breadcrumb navigation renders icons, active location, focus and action failures', async () => {
  await withDocument(async ({ shadow, Element }) => {
    const calls = [];
    const errors = [];
    const instance = createInstance();
    instance.reportError = (...args) => errors.push(args);
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = instance;
    workbench.shadow = shadow;
    workbench.activeEditorView = 'first:view';
    const nav = new Element('nav');
    const input = new Element('input');
    instance.breadcrumbs.view.set('first:view', { items: [
      { id: 'one', label: '<One>', icon: 'file', onSelect: () => calls.push('one') },
      { id: 'two', label: 'Two', onSelect: async () => { throw new Error('failed'); } },
      { id: 'three', label: 'Three', onSelect: () => { throw new Error('sync failure'); } },
    ] });
    shadow.activeElement = input;
    workbench.renderBreadcrumbs(nav);
    assert.equal(shadow.activeElement, input);
    assert.equal(nav.hidden, false);
    const [one, two, three] = nav.querySelectorAll('button');
    assert.equal(one.children[0].attributes['aria-hidden'], 'true');
    assert.equal(one.children[1].textContent, '<One>');
    assert.equal(two.children.length, 1);
    assert.equal(three.attributes['aria-current'], 'location');
    await one.listeners.click();
    await two.listeners.click();
    await three.listeners.click();
    assert.deepEqual(calls, ['one']);
    assert.match(errors[0][1], /breadcrumbFailed: Two/);
    assert.match(errors[1][1], /breadcrumbFailed: Three/);
    one.focus();
    workbench.renderBreadcrumbs(nav);
    assert.equal(shadow.activeElement.dataset.breadcrumbId, 'one');
    workbench.activeEditorView = null;
    workbench.activeDocument = 'first:other';
    workbench.renderBreadcrumbs(nav);
    assert.equal(nav.hidden, true);
  });
});

test('tab refresh inserts tabs before breadcrumbs without replacing editor content', () => {
  const workbench = Object.create(Workbench.prototype);
  const nav = { name: 'breadcrumbs' };
  const content = { name: 'content' };
  const tabs = { name: 'tabs', childElementCount: 1 };
  const editor = {
    children: [nav, content],
    querySelector(selector) {
      if (selector === '.edy-editor__breadcrumbs') return nav;
      if (selector === '.edy-editor__content') return content;
      return null;
    },
    insertBefore(child, reference) { this.children.splice(this.children.indexOf(reference), 0, child); },
  };
  workbench.layout = { querySelector: () => editor };
  workbench.renderEditorTabs = () => tabs;
  workbench.refreshDocumentTabs();
  assert.deepEqual(editor.children, [tabs, nav, content]);
});

test('editor places breadcrumbs first when there are no tabs', async () => {
  await withDocument(({ shadow, Element }) => {
    const instance = createInstance();
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = instance;
    workbench.shadow = shadow;
    workbench.activeEditorView = 'first:view';
    workbench.previewVisible = false;
    instance.breadcrumbs.view.set('first:view', {
      items: [{ id: 'one', label: 'One', onSelect() {} }],
    });
    workbench.renderEditorTabs = () => ({ childElementCount: 0 });
    workbench.renderEditorContent = () => {};
    const editor = workbench.renderEditor();
    assert.equal(editor.children[0].className, 'edy-editor__breadcrumbs');
    assert.equal(editor.children[0].hidden, false);
    assert.equal(editor.children[1].className, 'edy-editor__content');
    assert.ok(editor.children[1] instanceof Element);
  });
});

test('editor and preview render as separate sibling regions', async () => {
  await withDocument(({ Element }) => {
    const instance = createInstance();
    const previewView = { title: 'Preview', location: 'preview' };
    instance.views.entries = () => [['preview-id', previewView]];
    const workbench = Object.create(Workbench.prototype);
    workbench.instance = instance;
    workbench.activePreview = null;
    workbench.previewStates = new WeakMap();
    workbench.renderEditorTabs = () => ({ childElementCount: 0 });
    workbench.renderEditorContent = () => {};
    workbench.renderBreadcrumbs = () => {};
    workbench.actionButton = ({ label, action }) => {
      const button = new Element('button');
      button.textContent = label;
      button.dataset.action = action;
      return button;
    };
    workbench.renderContribution = (target) => target.append(new Element('content'));

    const editor = workbench.renderEditor();
    const preview = workbench.renderPreview(instance.views.entries());
    const workspace = new Element('workspace');
    workspace.append(editor, preview);

    assert.deepEqual(workspace.children, [editor, preview]);
    assert.equal(editor.children.some((child) => child.className === 'edy-preview'), false);
    assert.equal(preview.className, 'edy-preview');
  });
});
