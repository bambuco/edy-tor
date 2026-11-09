# API reference

Import from `src/index.js`.

## createEdy(options)

`container` is a host element. Optional `locale` is `en` or `es` (default
`en`); `theme` is `light`, `dark`, or `system` (default `system`); `services`
is a host capability object; and `extensions` is an array. Instances expose
async `start()`, `activateExtension(id)`, `deactivateExtension(id)`, and
`dispose()`. Expanded mode fills the browser viewport rather than invoking
native browser fullscreen; Escape restores it.

`logo` is an optional non-empty image URL string for the header, resolved
relative to the host page when relative. Each instance can use a different
logo; if omitted, Edy loads its bundled SVG from `src/assets/edy-logo.svg`.
The image is decorative beside the retained Edy text. Its source and licensing
note are recorded in `src/assets/CREDITS.md`.

## Extension context

- `commands.register(id, { label, execute, enabled })`, `execute(id, ...args)`,
  `refresh()`.
- `views.register(id, { title, location, icon, render, viewport })`, `open(id)`.
- `documents.open(id, { title, render })`, `close(id)`.
- `menus.register(menuId, { id, label, commandId, icon, shortcut, order })`.
  Built-in groups include `file`, `edit`, `view`, `help` and `context`.
- `status.register(id, { label, tooltip, onClick, commandId })`.
- `notifications.info(message)`, `success(message)`, `error(error, message)`.
- `ui.confirm(message)` returns a promise of a boolean.
- `services`, `subscriptions`, `locale`, `translate`, `extensionId`,
  and `apiVersion`.

For renderers that attach listeners or own frames, return `{ element,
dispose }`. Edy disposes the contribution when it is unmounted. A closed
document is removed; closing a sidebar or preview hides the surface.

## UI helpers

Exports include `createButton`, `createLink`, `createBadge`, `createMessage`,
`createProgress`, `createSeparator`, `createForm`, `createList`, `createTabs`,
`createButtonGroup`, `createAccordion`, `openDialog`, `confirmDialog` and
`createPreviewFrame`. See the JSDoc in
`src/ui/controls.js` for their parameters and `src/extensions/demo.js` for
working form, tree and preview examples.

`createForm` supports native `color`, `date`, `range`, `switch`, and other
standard fields, plus the `icon` and `tinymce` fields:

```js
createForm({
  translate: context.translate,
  onError: (error) => context.notifications.error(error),
  fields: [
    { name: 'icon', label: 'Icon', type: 'icon', value: 'star', options: [
      { value: 'star', label: 'Star', width: 24, height: 24, path: 'M12 2 L15 9 L22 9 L17 14 L19 22 L12 18 L5 22 L7 14 L2 9 L9 9 Z' },
    ] },
    { name: 'content', label: 'Content', type: 'tinymce', mode: 'simple', value: '<p>Hello</p>' },
  ],
  onSubmit: ({ icon, content }) => console.log(icon, content),
});
```

Icon options contain a string value and label and an SVG path with its view
box width and height. The example extension configures a selection from Font
Awesome Free. The icon field submits the chosen value; TinyMCE submits HTML.
Treat submitted HTML as untrusted and sanitize it before rendering.

TinyMCE modes are `simple` (default), `full` (general open-source plugins),
and `custom`. The simple toolbar includes undo/redo, blocks, bold, italic,
underline, left/center/right/justified alignment, and clear formatting.
Pass TinyMCE settings through `options`, for example
`{ mode: 'custom', options: { plugins: 'lists link', toolbar: 'bold | link' } }`.
The field owns `target`, `selector`, and `readonly`. The default license key
is `gpl`; the host is responsible for compliance or supplying its own
`license_key`. TinyMCE runs in a same-origin iframe to avoid its unsupported
Shadow DOM integration. The iframe follows the editor's height when it is
resized, including by keyboard or automatic resizing. The form rejects submissions until initialization
finishes; load failures are reported through `onError` (or `console.error`).
TinyMCE's own interface defaults to English; provide a local language pack
through its `language` and `language_url` options to localize it.
The static build includes the TinyMCE runtime. When deploying `src/` directly,
also deploy `node_modules/tinymce/` beside it. The example additionally
requires `node_modules/@fortawesome/free-solid-svg-icons/`.
See the packages' license files for their terms and attribution.

`createList(items, { tree: true, onSelect })` renders a
keyboard-operable tree with collapsible branches. List and tree items may
include an optional `icon` string, rendered decoratively before their label:

```js
createList([
  { id: 'src', label: 'src', icon: '📁', children: [
    { id: 'index', label: 'index.html', icon: '📄' },
  ] },
], { tree: true, onSelect: (item) => console.log(item.id) });
```

`openDialog` accepts a
title, DOM content, close label and host container, while `createButtonGroup`
groups labeled actions. These controls are demonstrated in the sample
extension. When the dialog content is a form returned by `createForm`, its
close button is placed in the form's action row next to the form buttons.
Other dialog content retains a separate close button.

For example, an extension can render a validated form:

```js
import { createForm } from './src/index.js';

// Inside activate(context):
context.views.register('settings', {
  title: 'Settings',
  location: 'editor',
  render: () => createForm({
    translate: context.translate,
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'enabled', label: 'Enabled', type: 'checkbox', value: true },
    ],
    onSubmit: (values) => context.notifications.info(values.title),
  }),
});
```

## Preview frame

`createPreviewFrame({ src, title, allowedOrigin, sandbox, operations,
validateMessage })` returns `{ element, postMessage, onMessage, dispose }`.
`onMessage` returns a disposable subscription. `postMessage` accepts an object
with an allowed `operation` and optional object `payload`; outgoing messages
are limited to 64 KiB. See [live preview](./preview.md).
