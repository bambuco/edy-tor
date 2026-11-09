/**
 * @file Serves project examples and browser modules on a local development server.
 *
 * @copyright 2026 David Herney - BambuCo
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

/**
 * Serves project files from the local development root.
 * @param {import('node:http').IncomingMessage} request Incoming request.
 * @param {import('node:http').ServerResponse} response Outgoing response.
 * @returns {Promise<void>} Request handling completion.
 */
async function serve(request, response) {
  let pathname;
  let requestUrl;
  try {
    requestUrl = new URL(request.url, 'http://localhost');
    pathname = decodeURIComponent(requestUrl.pathname);
  }
  catch (error) {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`Invalid URL: ${error.message}`);
    return;
  }
  if (pathname === '/') {
    pathname = '/examples/standalone/index.html';
  }
  let file = path.resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      if (!requestUrl.pathname.endsWith('/')) {
        response.writeHead(308, { location: `${requestUrl.pathname}/${requestUrl.search}` });
        response.end();
        return;
      }
      file = path.join(file, 'index.html');
      info = await stat(file);
    }
    if (!info.isFile()) {
      throw new Error('Requested path is not a file.');
    }
    response.writeHead(200, {
      'content-type': contentTypes.get(path.extname(file)) ?? 'application/octet-stream',
      'content-length': info.size,
      'x-content-type-options': 'nosniff',
    });
    createReadStream(file).pipe(response);
  }
  catch (error) {
    const missing = error.code === 'ENOENT' || error.code === 'ENOTDIR';
    response.writeHead(missing ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(missing ? 'Not found' : `Unable to serve file: ${error.message}`);
  }
}

/**
 * Starts the local static development server.
 * @returns {void}
 */
function main() {
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('PORT must be an integer between 1 and 65535.');
  }
  const server = createServer((request, response) => {
    serve(request, response).catch((error) => {
      console.error('Static server request failed.', error);
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      }
      response.end('Internal server error');
    });
  });
  server.on('error', (error) => {
    console.error(`Unable to listen on 127.0.0.1:${port}.`, error);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.info(`Edy demo available at http://127.0.0.1:${port}/`);
  });
}

try {
  main();
}
catch (error) {
  console.error('Unable to start the Edy server.', error);
  process.exitCode = 1;
}
