/**
 * @file Mounts two independent editor instances and wires host lifecycle controls.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createEdy } from '../../src/index.js';
import { demoExtension } from '../../src/extensions/demo.js';
import { createDemoAssets } from '../assets-demo.js';

/**
 * Creates both sample editors with distinct options and capabilities.
 * @returns {Promise<Array>} Active editor instances.
 */
async function createEditors() {
  const first = createEdy({
    container: document.querySelector('#host-editor-one'),
    locale: 'en',
    theme: 'light',
    title: 'English Editor',  // Custom title example
    services: {
      notifications: Object.freeze({ notify: (message) => console.info(message) }),
      assets: createDemoAssets('en'),
    },
    extensions: [demoExtension],
  });
  const second = createEdy({
    container: document.querySelector('#host-editor-two'),
    locale: 'es',
    theme: 'dark',
    title: 'Editor en Español',  // Custom title example
    extensions: [],
  });
  await Promise.all([first.start(), second.start()]);
  return [first, second];
}

/**
 * Starts the host example and wires its lifecycle controls.
 * @returns {Promise<void>} Startup completion.
 */
async function main() {
  let editors = await createEditors();
  const secondContainer = document.querySelector('#host-editor-two');
  document.querySelector('#toggle-second').addEventListener('click', () => {
    secondContainer.hidden = !secondContainer.hidden;
  });
  document.querySelector('#dispose-all').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    await Promise.all(editors.map((editor) => editor.dispose()));
    editors = [];
    document.querySelector('#host-editor-one').textContent = 'Both Edy instances have been disposed.';
    secondContainer.hidden = true;
  });
  window.addEventListener('pagehide', () => {
    for (const editor of editors) {
      editor.dispose();
    }
  }, { once: true });
}

main().catch((error) => {
  console.error('Host integration example failed.', error);
  const message = document.createElement('pre');
  message.textContent = error.message;
  document.body.append(message);
});
