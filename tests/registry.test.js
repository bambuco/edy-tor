/**
 * @file Tests contribution registry collisions, removal, and disposable cleanup.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { DisposableStore, Registry, disposable } from '../src/core/registry.js';

/**
 * Verifies registration ordering, collisions, and idempotent disposal.
 */
test('registry rejects collisions and unregisters a contribution once', () => {
  const changes = [];
  const registry = new Registry(() => changes.push(registry.entries().length));
  const contribution = { label: 'sample' };
  const registration = registry.register('sample', contribution);

  assert.equal(registry.get('sample'), contribution);
  assert.throws(() => registry.register('sample', {}), /already registered/);
  assert.deepEqual(registry.entries(), [['sample', contribution]]);
  assert.equal(registry.remove('sample'), true);
  registration.dispose();
  assert.equal(registry.remove('sample'), false);
  assert.equal(registry.get('sample'), undefined);
  assert.deepEqual(changes, [1, 0]);
});

/**
 * Verifies the store cleans up in reverse order and preserves failures.
 */
test('disposable store cleans up in reverse order and reports failures', async () => {
  const calls = [];
  const store = new DisposableStore();
  store.add(disposable(() => calls.push('first')));
  store.add(disposable(() => {
    calls.push('second');
    throw new Error('cleanup failed');
  }));
  store.add(disposable(() => calls.push('third')));

  await assert.rejects(store.dispose(), AggregateError);
  await store.dispose();
  assert.deepEqual(calls, ['third', 'second', 'first']);
});

/**
 * Verifies invalid disposable resources are rejected immediately.
 */
test('disposable store rejects invalid resources', () => {
  const store = new DisposableStore();
  assert.throws(() => store.add({}), /implement dispose/);
});
