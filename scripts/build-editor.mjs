/**
 * @file Bundles CodeMirror for browser use without import maps.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tinymceSource = path.join(root, 'node_modules/tinymce');
const tinymceDestination = path.join(root, 'src/ui/vendor/tinymce');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/ui/codemirror-entry.js'],
  outfile: 'src/ui/codemirror-bundle.js',
  bundle: true,
  minify: true,
  format: 'esm',
  metafile: true,
  legalComments: 'eof',
});
const packages = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const match = input.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  if (match) packages.add(match[1]);
}
const licenses = await Promise.all([...packages].sort().map(async (name) => {
  const text = await readFile(path.join(root, 'node_modules', name, 'LICENSE'), 'utf8');
  return `--- ${name} ---\n${text.trim()}\n`;
}));
await writeFile(path.join(root, 'src/ui/codemirror-licenses.txt'), licenses.join('\n'));
await rm(tinymceDestination, { recursive: true, force: true });
await mkdir(path.dirname(tinymceDestination), { recursive: true });
await cp(tinymceSource, tinymceDestination, { recursive: true });
