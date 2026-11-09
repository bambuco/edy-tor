/**
 * @file Orders help pages according to the getting-started links in the documentation index.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { marked } from 'marked';

/**
 * Orders the index first, followed by its getting-started links and remaining pages.
 * @param {Array<{file: string, title: string, markdown: string}>} pages Documentation pages.
 * @returns {Array} Ordered pages.
 */
export function orderDocumentationPages(pages) {
  const index = pages.find((page) => page.file === 'index.md');
  if (!index) throw new Error('Documentation must include docs/index.md.');
  const byFile = new Map(pages.map((page) => [page.file, page]));
  const ordered = [index];
  const seen = new Set([index.file]);
  let inGettingStarted = false;
  for (const token of marked.lexer(index.markdown)) {
    if (token.type === 'heading' && token.depth <= 2) {
      if (inGettingStarted) break;
      inGettingStarted = token.depth === 2 && token.text === 'Get started';
    }
    if (inGettingStarted && token.type === 'list') {
      for (const item of token.items) {
        marked.walkTokens(item.tokens, (link) => {
          if (link.type !== 'link') return;
          const match = link.href.match(/^\.\/([^/]+\.md)(?:[?#].*)?$/i);
          const page = match && byFile.get(match[1]);
          if (page && !seen.has(page.file)) {
            ordered.push(page);
            seen.add(page.file);
          }
        });
      }
    }
  }
  return ordered.concat(pages.filter((page) => !seen.has(page.file))
    .sort((a, b) => a.file.localeCompare(b.file)));
}
