/**
 * @file Simulates a host asset manager without real files or uploads.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const assets = [
  { id: 'demo-landscape', name: 'landscape.png', mimeType: 'image/png' },
  { id: 'demo-logo', name: 'logo.png', mimeType: 'image/png' },
  { id: 'demo-manual', name: 'manual.pdf', mimeType: 'application/pdf' },
];

export function createDemoAssets(locale = 'en') {
  const text = locale === 'es'
    ? { title: 'Archivos simulados del anfitrión', choose: 'Usar selección', cancel: 'Cancelar', empty: 'No hay archivos disponibles para este filtro.' }
    : { title: 'Simulated host files', choose: 'Use selection', cancel: 'Cancel', empty: 'No files match this filter.' };
  return {
    async resolvePreview({ id, signal }) {
      if (signal?.aborted) return null;
      const urls = {
        'demo-landscape': new URL('./landscape-demo.png', import.meta.url).href,
        'demo-logo': new URL('../src/assets/edy-logo.png', import.meta.url).href,
      };
      if (!assets.some((asset) => asset.id === id)) throw new Error(`Unknown asset "${id}".`);
      return urls[id] ? { url: urls[id], mimeType: 'image/png' } : null;
    },
    pick({ accept, multiple, currentValue, signal }) {
      if (signal?.aborted) return Promise.resolve(null);
      const dialog = document.createElement('dialog');
      dialog.className = 'demo-asset-dialog';
      const heading = document.createElement('h2');
      heading.textContent = text.title;
      const form = document.createElement('form');
      form.method = 'dialog';
      const matching = assets.filter((asset) => !accept.length || accept.some((type) =>
        type === asset.mimeType || (type.endsWith('/*') && asset.mimeType.startsWith(type.slice(0, -1)))));
      if (!matching.length) {
        const empty = document.createElement('p');
        empty.textContent = text.empty;
        form.append(empty);
      }
      for (const asset of matching) {
        const label = document.createElement('label');
        label.style.display = 'block';
        const input = document.createElement('input');
        input.type = multiple ? 'checkbox' : 'radio';
        input.name = 'asset';
        input.value = asset.id;
        input.checked = currentValue.includes(asset.id);
        label.append(input, document.createTextNode(` ${asset.name} (${asset.mimeType})`));
        if (asset.mimeType === 'image/png') {
          const thumbnail = document.createElement('img');
          thumbnail.src = asset.id === 'demo-logo'
            ? new URL('../src/assets/edy-logo.png', import.meta.url).href
            : new URL('./landscape-demo.png', import.meta.url).href;
          thumbnail.alt = '';
          thumbnail.style.cssText = 'display:block;width:96px;height:60px;object-fit:contain;margin:4px 0 8px 20px;';
          label.append(thumbnail);
        }
        form.append(label);
      }
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = text.cancel;
      cancel.addEventListener('click', () => dialog.close('cancel'));
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.value = 'confirm';
      submit.textContent = text.choose;
      form.append(cancel, submit);
      dialog.append(heading, form);
      document.body.append(dialog);
      return new Promise((resolve, reject) => {
        const abort = () => dialog.close('cancel');
        const cleanup = () => {
          signal?.removeEventListener('abort', abort);
          dialog.remove();
        };
        dialog.addEventListener('close', () => {
          const result = dialog.returnValue === 'confirm'
            ? matching.filter((asset) => [...form.querySelectorAll('input:checked')].some((input) => input.value === asset.id))
              .map((asset) => ({ ...asset }))
            : null;
          cleanup();
          resolve(result);
        }, { once: true });
        signal?.addEventListener('abort', abort, { once: true });
        try {
          dialog.showModal();
        }
        catch (error) {
          cleanup();
          reject(error);
        }
      });
    },
  };
}
