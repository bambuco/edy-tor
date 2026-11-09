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
standard fields, plus the `icon`, `tinymce`, `codemirror`, `sortable`, `asset`, and
`table` fields:

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
underline, left/center/right/justified alignment, bulleted and numbered lists,
links, and clear formatting.
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

Forms can mix fields and optional, independently collapsible groups in their
`fields` array. Groups use `type: 'group'`, a `label`, `fields`, and optional
`collapsed: true`; nested groups are not supported. Group field names share
the form's namespace and submit flat values. Collapsing a group does not hide
its values from validation or submission; a group opens when an invalid field
inside it needs focus.

```js
createForm({
  translate: context.translate,
  fields: [
    { name: 'count', type: 'number', value: 3 },
    { type: 'group', label: 'Options', collapsed: true, fields: [
      { name: 'items', type: 'sortable', label: 'Items',
        value: ['First', 'Second'], required: true,
        visibleWhen: { field: 'count', equals: 3 } },
    ] },
  ],
  onSubmit: (values) => console.log(values),
});
```

`sortable` edits an array of strings using add, remove, and move buttons.
The actions use icons with accessible names. Set `editText: false` to make
the item text read-only, and `allowAdd: false` to hide the add button; both
default to `true`. Removal and reordering remain available independently.
`newItem` optionally supplies the string for new items (default: `''`), which
is useful when adding is enabled but text editing is disabled.
Its `required` validation requires at least one non-blank item; individual
empty items are otherwise permitted. Its `validate` callback receives a copy
of the array. Disabled lists cannot be edited.

`codemirror` is a local CodeMirror 6 code editor. It accepts `language`:
`'html'` (default), `'css'`, or `'javascript'`, and submits a string. It
supports `value`, `disabled`, `required`, `validate`, `visibleWhen`, and form
groups. The editor runs in a same-origin iframe and is destroyed on unload.
The form refuses submission while it is loading or if loading fails; errors
are sent to `onError`. Code is data, never executed by the control.

`table` uses declared string-valued columns and an array of row objects:

```js
{ name: 'attributes', label: 'Attributes', type: 'table',
  columns: [{ name: 'key', label: 'Key' }, { name: 'value', label: 'Value' }],
  value: [{ key: 'title', value: 'Hello' }], editable: true }
```

Each row must contain exactly the declared column names and string values.
With `editable: true` (the default), cells are editable and rows can be added
and removed; new cells start empty. `editable: false` displays fixed rows as
text with no add or remove actions. `disabled` disables editable controls.
`required` means at least one row; use `validate(rows)` for cell-level rules.
Callbacks and submission receive independent copies of the rows. The table
does not add or remove columns.

`asset` delegates file selection to a host-provided asynchronous picker:

```js
const form = createForm({
  translate: context.translate,
  onError: (error) => context.notifications.error(error),
  fields: [{
    name: 'images', label: 'Images', type: 'asset',
    multiple: true, accept: ['image/*'], value: ['asset-42'],
    pick: (request) => context.services.assets.pick(request),
    resolvePreview: (request) => context.services.assets.resolvePreview(request),
  }],
  onSubmit: ({ images }) => console.log(images), // array of IDs
});
// When the contribution is permanently removed:
return { element: form, dispose: () => form.dispose() };
```

`value` and the submitted value are always arrays of unique nonempty IDs;
`multiple` defaults to `false` and limits the array to at most one ID.
`accept` is an array of MIME types or patterns, and `allowClear` defaults to
`true`. Initial IDs are displayed as IDs until selected through the picker.
`required` means at least one selection. While a picker is open, submission is
blocked; cancellation preserves the current value, while a confirmed empty
array clears it. Picker failures are reported through `onError`, preserve the
selection, and block submission until retried or cleared. An asset field
hidden by `visibleWhen` aborts a pending request and is excluded from submission.
Call `form.dispose()` on permanent unmount to abort pending asset requests;
temporary DOM moves do not require disposal. See
[host asset picker](./extensions.md#host-asset-picker) for the service
contract, cancellation, and host responsibilities.

The optional `resolvePreview({ id, signal })` adds a preview button to each
selected asset, including initial IDs. It resolves to `null` for an
unsupported preview or `{ url, mimeType, dispose? }`, where `dispose` releases
resources such as object URLs. Resolution is lazy and does not change form
values. Closing, changing or hiding the selection, or disposing the form
aborts pending work and releases any result, including late results from a
provider that ignores abort. Errors are reported through `onError` and shown
in the preview area without blocking form submission.

Supported preview MIME types are PNG, JPEG, GIF, WebP, AVIF, MPEG/OGG/WAV/WebM/MP4
audio, MP4/WebM/OGG video, and PDF. Browser codec and PDF-viewer support varies.
Only HTTP(S) and blob URLs are accepted; URLs containing credentials are
rejected. HTML and SVG are not rendered. PDFs use a sandboxed iframe and may
not display in browsers that do not support PDF viewing in sandboxed frames.

`visibleWhen` accepts `{ field, equals }` or a function receiving all current
values. Number and range fields compare numerically when `equals` is a number;
empty values never match a number. Submitted number and range values remain
strings. Hidden fields retain their values, which are still available to
visibility conditions, but are excluded from validation and submission.

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
