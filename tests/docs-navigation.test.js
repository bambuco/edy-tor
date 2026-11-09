/**
 * @file Tests documentation navigation ordering from the index.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { orderDocumentationPages } from '../scripts/docs-navigation.mjs';

test('documentation navigation follows getting-started links and appends unlisted pages', () => {
  const pages = [
    { file: 'z.md' },
    { file: 'index.md', markdown: '# Index\n\n## Get started\n\n- [Beta](./beta.md#part)\n- [Alpha](./alpha.md)\n- [Again](./beta.md)\n- [External](https://example.com/outside.md)\n\n## Other\n\n- [Z](./z.md)' },
    { file: 'alpha.md' },
    { file: 'beta.md' },
    { file: 'c.md' },
  ];
  assert.deepEqual(orderDocumentationPages(pages).map((page) => page.file),
    ['index.md', 'beta.md', 'alpha.md', 'c.md', 'z.md']);
  assert.throws(() => orderDocumentationPages([]), /index\.md/);
});
