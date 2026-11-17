/**
 * @file Tests the in-memory file provider used by the demo extension.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { DemoFileExplorerProvider } from '../src/extensions/demo-file-provider.js';

test('demo provider lists a stable root and nested project without file contents', async () => {
  const provider = new DemoFileExplorerProvider();
  const root = await provider.list(null);
  assert.deepEqual(root.map(({ id, name, type }) => ({ id, name, type })), [
    { id: 'demo-src', name: 'src', type: 'folder' },
    { id: 'demo-assets', name: 'assets', type: 'folder' },
    { id: 'demo-readme', name: 'README.md', type: 'file' },
  ]);
  assert.deepEqual((await provider.list('demo-src')).map((entry) => entry.name), ['index.html', 'styles.css']);
  root[0].name = 'changed outside provider';
  assert.equal((await provider.list(null))[0].name, 'src');
});

test('demo provider simulates creation, rename and recursive deletion in memory', async () => {
  const provider = new DemoFileExplorerProvider();
  const folder = await provider.createFolder(null, 'drafts');
  const file = await provider.createFile(folder.id, {
    name: 'notes.txt',
    size: 12,
    type: 'text/plain',
    text() { throw new Error('File contents must not be read.'); },
  });
  assert.deepEqual(
    (await provider.list(folder.id)).map(({ id, name, type, size, mimeType }) =>
      ({ id, name, type, size, mimeType })),
    [{ id: file.id, name: 'notes.txt', type: 'file', size: 12, mimeType: 'text/plain' }],
  );
  await provider.rename(file.id, 'renamed.txt');
  assert.equal((await provider.list(folder.id))[0].name, 'renamed.txt');
  assert.match(await provider.getUrl(file.id), /^https:\/\/example\.invalid\//);

  await provider.delete(folder.id);
  assert.deepEqual(await provider.list(null), [
    { id: 'demo-src', name: 'src', type: 'folder', parentId: null },
    { id: 'demo-assets', name: 'assets', type: 'folder', parentId: null },
    {
      id: 'demo-readme', name: 'README.md', type: 'file', parentId: null,
      size: 2048, mimeType: 'text/markdown',
    },
  ]);
  await assert.rejects(provider.getUrl(file.id), /does not exist/);
});

test('demo provider rejects invalid parents and duplicate sibling names', async () => {
  const provider = new DemoFileExplorerProvider();
  await assert.rejects(provider.createFolder('demo-readme', 'child'), /not a folder/);
  await assert.rejects(provider.createFolder(null, 'src'), /already exists/);
  await assert.rejects(provider.rename('demo-readme', 'src'), /already exists/);
  await assert.rejects(provider.createFolder(null, '../outside'), /cannot contain slashes/);
});

test('demo provider moves entries without allowing collisions or folder cycles', async () => {
  const provider = new DemoFileExplorerProvider();
  const blocker = await provider.createFile('demo-src', {
    name: 'README.md',
    size: 1,
    type: 'text/markdown',
  });
  await assert.rejects(provider.move('demo-readme', 'demo-src'), /already exists/);
  await assert.rejects(provider.move('demo-src', 'demo-src'), /itself or a descendant/);
  const moved = await provider.move(blocker.id, 'demo-assets');
  assert.equal(moved.parentId, 'demo-assets');
  assert.equal((await provider.list('demo-assets')).at(-1).id, blocker.id);
});

test('demo provider replaces upload and edited content using metadata only', async () => {
  const provider = new DemoFileExplorerProvider();
  const uploaded = await provider.replace('demo-readme', {
    source: 'upload',
    data: { name: 'other.md', size: 12, type: 'text/markdown' },
  });
  assert.equal(uploaded.size, 12);
  assert.equal(uploaded.mimeType, 'text/markdown');
  const edited = await provider.replace('demo-readme', {
    source: 'edited-content',
    data: 'updated',
  });
  assert.equal(edited.size, 7);
  assert.equal(edited.mimeType, 'text/markdown');
  await assert.rejects(provider.replace('demo-src', {
    source: 'upload',
    data: { size: 1, type: 'text/plain' },
  }), /Only simulated files/);
});
