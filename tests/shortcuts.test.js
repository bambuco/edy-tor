/**
 * @file Tests parsing and matching of menu shortcut declarations.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesShortcut, parseShortcut } from '../src/core/shortcuts.js';
import { EdyInstance } from '../src/core/instance.js';
import { DisposableStore, Registry } from '../src/core/registry.js';

test('shortcuts normalize modifiers and match the exact keyboard event', () => {
  const shortcut = parseShortcut('Shift+Ctrl+G');
  assert.equal(shortcut.canonical, 'ctrl+shift+g');
  const event = { key: 'G', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };
  assert.equal(matchesShortcut(event, shortcut), true);
  assert.equal(matchesShortcut({ ...event, altKey: true }, shortcut), false);
  assert.equal(matchesShortcut({ ...event, key: 'h' }, shortcut), false);
  assert.equal(parseShortcut('F2').key, 'f2');
});

test('shortcuts reject ambiguous and invalid declarations', () => {
  for (const shortcut of ['', 'A', 'Shift+A', 'Ctrl+Ctrl+X', 'Ctrl+', 'Ctrl+Nope']) {
    assert.throws(() => parseShortcut(shortcut), TypeError);
  }
});

test('menu registrations validate and release instance-scoped shortcuts', async () => {
  const instance = Object.create(EdyInstance.prototype);
  instance.menus = new Registry(() => {});
  const store = new DisposableStore();
  const context = instance.createExtensionContext({ id: 'test' }, store, []);
  const item = { id: 'one', label: 'Action', commandId: 'run', icon: '*', shortcut: 'Ctrl+Shift+G' };
  const registration = context.menus.register('edit', item);
  assert.equal(instance.menus.entries()[0][1].commandId, 'test:run');
  assert.throws(() => context.menus.register('file', {
    ...item, id: 'two', shortcut: 'Shift+Ctrl+g',
  }), /already registered/);
  assert.throws(() => context.menus.register('edit', {
    id: 'bad', label: 'Bad', shortcut: 'Ctrl+G',
  }), /requires a command/);
  assert.throws(() => context.menus.register('edit', {
    id: 'bad', label: 'Bad', icon: {},
  }), TypeError);
  registration.dispose();
  context.menus.register('file', { ...item, id: 'two' });
  await store.dispose();
  assert.equal(instance.menus.entries().length, 0);
});
