/**
 * @file Creates sandboxed preview frames and validates their message channels.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Creates a sandboxed preview frame with strict message source and origin checks.
 * @param {{src: string, title?: string, allowedOrigin: string, sandbox?: string, operations?: string[]}} options Preview options.
 * @returns {{element: HTMLIFrameElement, postMessage: Function, onMessage: Function, dispose: Function}} Preview API.
 */
export function createPreviewFrame({
  src,
  title = 'Edy preview',
  allowedOrigin,
  sandbox = 'allow-scripts',
  operations = [],
  validateMessage = () => true,
}) {
  const url = new URL(src, document.baseURI);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError('Preview URLs must use HTTP or HTTPS.');
  }
  if (!Array.isArray(operations) || operations.some((operation) => typeof operation !== 'string') ||
      typeof validateMessage !== 'function') {
    throw new TypeError('Preview operations and message validation must use explicit typed contracts.');
  }
  const sandboxTokens = sandbox.split(/\s+/).filter(Boolean);
  if (sandboxTokens.some((token) => !['allow-scripts', 'allow-same-origin'].includes(token))) {
    throw new TypeError('The preview sandbox only supports allow-scripts and allow-same-origin.');
  }
  const allowedUrl = allowedOrigin === 'null' ? null : new URL(allowedOrigin);
  if (allowedUrl && !['http:', 'https:'].includes(allowedUrl.protocol)) {
    throw new TypeError('Allowed preview origins must use HTTP or HTTPS.');
  }
  const expectedOrigin = allowedUrl?.origin ?? 'null';
  const preservesOrigin = sandboxTokens.includes('allow-same-origin');
  if (url.origin !== expectedOrigin && expectedOrigin !== 'null') {
    throw new Error('The preview URL origin must match the configured allowed origin.');
  }
  if (!preservesOrigin && expectedOrigin !== 'null') {
    throw new Error('A sandbox without allow-same-origin must use the opaque "null" origin.');
  }
  if (preservesOrigin && url.origin === window.location.origin) {
    throw new Error('allow-same-origin is only permitted for a preview served from a separate origin.');
  }
  if (preservesOrigin && expectedOrigin !== url.origin) {
    throw new Error('A preview that preserves its origin must use its exact URL origin.');
  }
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.className = 'edy-preview-frame';
  frame.setAttribute('sandbox', sandbox);
  frame.referrerPolicy = 'no-referrer';
  frame.loading = 'eager';
  frame.src = url.href;
  const listeners = new Set();
  const allowedOperations = new Set(operations);

  /**
   * Validates and forwards messages sent by this preview frame.
   * @param {MessageEvent} event Window message event.
   * @returns {void}
   */
  function handleMessage(event) {
    if (event.source !== frame.contentWindow || event.origin !== expectedOrigin) {
      return;
    }
    const data = event.data;
    if (!data || Object.getPrototypeOf(data) !== Object.prototype ||
        data.type !== 'edy-preview' || typeof data.operation !== 'string' ||
        !allowedOperations.has(data.operation) ||
        (data.payload !== undefined &&
          (!data.payload || Object.getPrototypeOf(data.payload) !== Object.prototype)) ||
        !validateMessage(data)) {
      return;
    }
    for (const listener of listeners) {
      listener(data);
    }
  }
  window.addEventListener('message', handleMessage);

  return {
    element: frame,
    postMessage(message) {
      if (!message || Object.getPrototypeOf(message) !== Object.prototype ||
          !allowedOperations.has(message.operation) ||
          (message.payload !== undefined &&
            (!message.payload || Object.getPrototypeOf(message.payload) !== Object.prototype))) {
        throw new TypeError('Preview message operation is not allowed.');
      }
      if (JSON.stringify(message).length > 65536) {
        throw new RangeError('Preview messages must be smaller than 64 KiB.');
      }
      if (expectedOrigin === 'null') {
        frame.contentWindow?.postMessage({ ...message, type: 'edy-preview' }, '*');
      }
      else {
        frame.contentWindow?.postMessage({ ...message, type: 'edy-preview' }, expectedOrigin);
      }
    },
    onMessage(listener) {
      listeners.add(listener);
      return {
        dispose() {
          listeners.delete(listener);
        },
      };
    },
    dispose() {
      window.removeEventListener('message', handleMessage);
      listeners.clear();
      frame.remove();
    },
  };
}
