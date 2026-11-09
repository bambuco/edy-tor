# Installation and integration

## Requirements

Use a current browser with ES modules and Shadow DOM. Node.js 20 or later is
required for the development server, tests, build and help generation, not
for loading the editor in a production browser.

## Run the examples

From the root folder, run:

```sh
npm install
npm start
```

Open `http://127.0.0.1:4173/` or
`http://127.0.0.1:4173/examples/host/`. The default server listens on
`127.0.0.1:4173`; set `PORT` to change it. Serve modules over HTTP(S) with a
JavaScript MIME type; opening an HTML file directly is not supported.

## Embed Edy

Deploy `src/` and its CSS together on the same origin as your page. From an
HTML page at the same level as `src/`:

For TinyMCE form fields, also deploy `node_modules/tinymce/` at the same level.
The static build includes this runtime and the Font Awesome Free package used
by the sample extension; the TinyMCE iframe and its runtime must be same-origin.

```html
<div id="editor" style="height: 80vh"></div>
<script type="module">
  import { createEdy } from './src/index.js';

  const editor = createEdy({
    container: document.querySelector('#editor'),
    locale: 'en',
    theme: 'system',
    logo: '/images/my-editor-logo.svg', // Optional; omit for the Edy logo.
    services: {},
    extensions: [],
  });
  await editor.start();
  // When your host view is removed:
  // await editor.dispose();
</script>
```

Set a definite container height. Use one host element per editor. Do not mount
into an element with an unrelated shadow root. After disposal completes the
same element can be used for a new instance. `start()` and `dispose()` return
promises; handle rejected promises in production.
The optional `logo` URL is relative to the host page, and can differ per
instance. Deploy the bundled `src/assets/` directory with `src/` when using
the default logo; its credits are in `src/assets/CREDITS.md`.

See [extensions](./extensions.md) for useful contributions and
[API reference](./api.md) for options.
