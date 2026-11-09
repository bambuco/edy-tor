/**
 * @file Converts developer Markdown guides into a navigable offline HTML help site.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';
import { orderDocumentationPages } from './docs-navigation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const help = path.join(root, 'help');

/**
 * Escapes untrusted text for HTML attributes and navigation.
 * @param {string} value Source text.
 * @returns {string} HTML-safe text.
 */
function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/**
 * Generates one HTML page for each Markdown guide.
 * @returns {Promise<void>} Generation completion.
 */
async function buildDocs() {
  const files = (await readdir(docs)).filter((file) => file.endsWith('.md')).sort();
  if (!files.includes('index.md')) {
    throw new Error('Documentation must include docs/index.md.');
  }
  const pages = orderDocumentationPages(await Promise.all(files.map(async (file) => {
    const markdown = await readFile(path.join(docs, file), 'utf8');
    const title = markdown.match(/^# (.+)$/m)?.[1];
    if (!title) {
      throw new Error(`Documentation page "${file}" needs a level-one heading.`);
    }
    return { file, title, markdown };
  })));
  marked.use({
    walkTokens(token) {
      if (token.type === 'link') {
        token.href = token.href.replace(/\.md(?=([?#]|$))/i, '.html');
      }
    },
  });
  await mkdir(help, { recursive: true });
  for (const page of pages) {
    const navigation = pages.map((item) => {
      const current = item.file === page.file ? ' aria-current="page"' : '';
      return `<li><a href="${escapeHtml(item.file.replace(/\.md$/, '.html'))}"${current}>${escapeHtml(item.title)}</a></li>`;
    }).join('\n');
    const html = `<!doctype html>
<!-- Generated developer help page. Copyright 2026 David Herney - BambuCo; GPL v3 or later. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} | Edy documentation</title><link rel="icon" type="image/png" href="../src/assets/edy-logo.png"><link rel="stylesheet" href="./help.css"><script defer src="./help-navigation.js"></script></head>
<body><header><a href="./index.html"><img src="../src/assets/edy-logo.svg" alt="" width="32" height="32">Edy documentation</a><button type="button" class="menu-toggle" aria-label="Toggle documentation menu" aria-controls="help-navigation" aria-expanded="false" hidden>☰</button></header><div class="layout">
<nav id="help-navigation" aria-label="Documentation" tabindex="0"><ul>${navigation}</ul></nav>
<main tabindex="0">${marked.parse(page.markdown)}</main></div></body></html>\n`;
    await writeFile(path.join(help, page.file.replace(/\.md$/, '.html')), html);
  }
  await copyFile(path.join(root, 'scripts/help-navigation.js'), path.join(help, 'help-navigation.js'));
  await writeFile(path.join(help, 'help.css'), `/* Styles the generated Edy documentation site. GPL v3 or later. */
:root { color-scheme: light dark; font: 16px/1.6 system-ui, sans-serif; }
body { margin: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: #245c9e; color: white; }
header a { display: inline-flex; align-items: center; gap: .6rem; color: inherit; font-weight: bold; text-decoration: none; }
header img { display: block; width: 32px; height: 32px; object-fit: contain; }
.menu-toggle { display: none; color: inherit; background: transparent; border: 1px solid currentColor; border-radius: 4px; font: inherit; font-size: 1.4rem; line-height: 1; padding: .3rem .5rem; cursor: pointer; }
.menu-toggle:focus-visible { outline: 2px solid white; outline-offset: 3px; }
.layout { display: grid; grid-template-columns: 15rem minmax(0, 60rem); gap: 2rem; flex: 1; min-height: 0; width: min(100%, 79rem); box-sizing: border-box; margin: 0 auto; padding: 0 2rem; }
nav, main { min-width: 0; min-height: 0; overflow: auto; padding: 1rem 0; }
nav ul { list-style: none; padding: 0; } nav a { display: block; padding: .3rem; }
nav a[aria-current] { font-weight: bold; }
pre { overflow: auto; padding: 1rem; background: light-dark(#f0f3f6, #222b35); }
code { font-family: ui-monospace, monospace; } a { color: light-dark(#175ba0, #8fc4ff); }
@media (max-width: 700px) {
  header { padding: .75rem 1rem; }
  .menu-toggle:not([hidden]) { display: block; }
  .layout { display: flex; flex-direction: column; gap: 0; padding: 0 1rem; }
  nav { flex: none; max-height: 40%; padding: .25rem 0; overflow: auto; }
  nav.is-collapsible:not(.is-open) { display: none; }
  nav ul { margin: 0; }
  main { flex: 1; }
}\n`);
  console.info(`Generated ${pages.length} documentation pages in help/.`);
}

buildDocs().catch((error) => {
  console.error('Unable to generate documentation.', error);
  process.exitCode = 1;
});
