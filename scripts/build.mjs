/**
 * @file Builds the static distribution and checks the compressed core size budget.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');

/**
 * Copies the browser-ready package and reports compressed core size.
 * @returns {Promise<void>} Build completion.
 */
async function build() {
  const { stdout } = await promisify(execFile)(process.execPath, [path.join(root, 'scripts/docs.mjs')], { cwd: root });
  process.stdout.write(stdout);
  await mkdir(output, { recursive: true });
  for (const entry of ['src', 'examples', 'scripts', 'docs', 'help', 'README.md', 'LICENSE', 'package.json', 'package-lock.json']) {
    await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
  }
  for (const dependency of ['tinymce', '@fortawesome/free-solid-svg-icons']) {
    const destination = path.join(output, 'node_modules', dependency);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, 'node_modules', dependency), destination, { recursive: true });
  }
  const coreFiles = [
    'src/index.js',
    'src/core/instance.js',
    'src/core/registry.js',
    'src/core/preview.js',
    'src/core/shortcuts.js',
    'src/i18n/messages.js',
    'src/ui/controls.js',
    'src/ui/accordion.js',
    'src/ui/preview-viewport.js',
    'src/workbench/workbench.js',
    'src/workbench/styles.css',
  ];
  const core = Buffer.concat(await Promise.all(coreFiles.map((file) => readFile(path.join(root, file)))));
  const compressedBytes = gzipSync(core).byteLength;
  const report = {
    coreGzipBytes: compressedBytes,
    budgetBytes: 150 * 1024,
    withinBudget: compressedBytes <= 150 * 1024,
  };
  await writeFile(path.join(output, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.info(`Static build written to ${path.relative(root, output)}.`);
  console.info(`Core JavaScript and essential CSS: ${compressedBytes} bytes gzip (budget: ${report.budgetBytes}).`);
  if (!report.withinBudget) {
    throw new Error('The core exceeds the proposed 150 KiB gzip budget.');
  }
}

build().catch((error) => {
  console.error('Edy build failed.', error);
  process.exitCode = 1;
});
