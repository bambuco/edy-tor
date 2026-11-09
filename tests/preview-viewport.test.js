/**
 * @file Tests logical preview dimensions, configuration validation and fit scaling.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { fitPreviewScale, normalizePreviewViewport } from '../src/ui/preview-viewport.js';

test('preview defaults and fit scale preserve logical dimensions without upscaling', () => {
  const config = normalizePreviewViewport({});
  assert.deepEqual([config.width, config.height, config.scale], [1024, 768, 'auto']);
  assert.equal(fitPreviewScale(512, 600, 1024, 768), 0.5);
  assert.equal(fitPreviewScale(2000, 384, 1024, 768), 0.5);
  assert.equal(fitPreviewScale(3000, 3000, 1024, 768), 1);
  assert.equal(fitPreviewScale(0, 10, 1024, 768), 0);
});

test('preview configuration rejects invalid limits, scale, presets and callbacks', () => {
  const valid = normalizePreviewViewport({
    width: 375, height: 667, scale: 50,
    presets: [{ id: 'phone', label: 'Phone', width: 375, height: 667 }],
  });
  assert.equal(valid.presets[0].id, 'phone');
  for (const options of [
    { width: 0 }, { width: 150 }, { width: 1.5 }, { minWidth: 800, maxWidth: 400 },
    { scale: 10 }, { scale: 'fit' }, { minScale: 101, maxScale: 100 },
    { presets: [{ id: 'x', label: 'X', width: 100, height: 500 }] },
    { presets: [{ id: 'x', label: 'X', width: 500, height: 500 },
      { id: 'x', label: 'X', width: 500, height: 500 }] },
    { onChange: true },
  ]) {
    assert.throws(() => normalizePreviewViewport(options));
  }
});
