# API reference

Import from `src/index.js`.

## createEdy(options)

`container` is a host element. Optional `locale` is `en` or `es` (default
`en`); `theme` is `light`, `dark`, or `system` (default `system`); `services`
is a host capability object; and `extensions` is an array. Instances expose
async `start()`, `activateExtension(id)`, `deactivateExtension(id)`, and
`dispose()`. Expanded mode fills the browser viewport rather than invoking
native browser fullscreen; Escape restores it.

`initialState` optionally configures the initial visibility and fallback
titles of the primary sidebar, secondary sidebar, and bottom panel. Each region
accepts `{ visible?: boolean, title?: string }`; `editor` and `preview` accept
`{ visible?: boolean }`. Unspecified panel/sidebar visibility follows the
existing responsive default (visible on wide screens, hidden on compact
screens); the editor defaults to visible and preview defaults to hidden. A
region title is used for its accessible name and as the heading when no view is
selected; an active view's own title remains unchanged. A visible preview
requires a registered preview view. `showPanelVisibilityInMenu` defaults to `true`;
set it to `false` to omit the built-in panel/sidebar toggles from the `View`
menu.

```js
createEdy({
  container,
  initialState: {
    bottomPanel: { visible: false, title: 'Console' },
    editor: { visible: false },
    preview: { visible: true },
    showPanelVisibilityInMenu: false,
  },
});
```

`logo` is an optional non-empty image URL string for the header, resolved
relative to the host page when relative. Each instance can use a different
logo; if omitted, Edy loads its bundled SVG from `src/assets/edy-logo.svg`.
The image is decorative beside the retained Edy text. Its source and licensing
note are recorded in `src/assets/CREDITS.md`.

`customCss` is an optional non-empty stylesheet URL. Relative paths such as
`./styles/edy.css` resolve against the host document's base URL (including a
`<base>` element); `/styles/edy.css` is relative to the origin, and absolute
URLs are also supported. Edy loads it in the instance's shadow root after its
built-in styles. Normal CSS cascade and specificity rules apply. Styles do not
cross into embedded iframes, such as previews or rich-text editors. A loading
failure is logged and shown as an error notification; Edy remains usable with
its built-in styles. Each instance may use a different stylesheet.

## Extension context

- `commands.register(id, { label, execute, enabled })`, `execute(id, ...args)`,
  `refresh()`.
- `views.register(id, { title, location, icon, render, viewport })`, `open(id)`.
  Activity-bar `icon` accepts a character, a standard key such as `robot` or
  `card`, or direct Font Awesome classes such as `fa-solid fa-robot`.
- `documents.open(id, { title, icon, render })`, `close(id)`, `activate(id)`.
  `activate` returns `true` when the registered document was focused and
  `false` when it does not exist. Optional `icon` uses the same glyph, alias,
  or direct Font Awesome classes as view icons and appears in the editor tab.
- `breadcrumbs.set({ type, id }, items)`, `clear({ type, id })`.
- `menus.register(menuId, { id, label, commandId, icon, shortcut, order })`.
  Menu and accordion `icon` values use the same aliases or direct Font Awesome
  classes. Unknown class names are passed through without validation.
  Built-in groups include `file`, `edit`, `view`, `help` and `context`.
- `status.register(id, { label, tooltip, onClick, commandId })`.
- `notifications.info(message)`, `success(message)`, `error(error, message)`.
- `ui.confirm(message)` returns a promise of a boolean.
- `services`, `subscriptions`, `locale`, `translate`, `extensionId`,
  and `apiVersion`.

`createTabs` accepts tab definitions with `{ id, label, icon }`. The optional
`icon` uses the same icon formats as buttons and is rendered decoratively
before the label.

For renderers that attach listeners or own frames, return `{ element,
dispose }`. Edy disposes the contribution when it is unmounted. A closed
document is removed; closing a sidebar or preview hides the surface.

### Editor breadcrumbs

An extension can set a breadcrumb path for one of its own registered documents
or editor views:

```js
context.breadcrumbs.set({ type: 'document', id: 'page' }, [
  { id: 'page', label: 'Page', icon: 'file', onSelect: () => focusPage() },
  { id: 'section', label: 'Introduction', onSelect: () => focusSection() },
]);
```

`type` is `document` or `view`; a view must have `location: 'editor'`.
Each item requires a unique non-empty `id`, a non-empty `label`, and an
`onSelect` function. Optional `icon` accepts the same glyph, alias, or Font
Awesome classes as view icons and appears before the label. The final item
denotes the current location. Buttons invoke `onSelect` for mouse and keyboard;
the extension decides how to select, focus, or scroll its content. Synchronous
errors and rejected promises are logged and reported through notifications.

`set` replaces the path; an empty array hides it. `clear(target)` also hides it.
Updates are independent of editor rendering. Only the active contribution's
path is visible, below the tabs or first when tabs are absent; it stays visible
when the editor content scrolls. A split preview does not have a separate path.
Paths are discarded when their contribution is removed, including when a
document is closed or an extension is deactivated. Updating an unregistered
target or using the API after disposal throws; cancel asynchronous updates when
their contribution is closed. In particular, an ID may be reused after closing
a document, so an update addressed by that ID cannot distinguish the old
document from the new one. Separate Edy instances have separate paths.

## UI helpers

Exports include `createIconElement`, `iconAliases`, `loadIconStylesheet`,
`createButton`, `createLink`, `createBadge`, `createMessage`,
`createProgress`, `createSeparator`, `createForm`, `createList`, `createTabs`,
`createButtonGroup`, `createAccordion`, `openDialog`, `confirmDialog` and
`createPreviewFrame`. See the JSDoc in
`src/ui/controls.js` for their parameters and `src/extensions/demo.js` for
working form, tree and preview examples. `createIconElement(icon)` creates a
decorative icon node; `loadIconStylesheet(root)` loads its Font Awesome Free
styles into a document or shadow root. `iconAliases` is a read-only object of
standard names to Font Awesome classes.

`createForm` supports native `color`, `date`, `range`, `switch`, and other
standard fields, plus the `input-select`, `icon`, `tinymce`, `codemirror`,
`sortable`, `asset`, and `table` fields:

```js
createForm({
  translate: context.translate,
  onError: (error) => context.notifications.error(error),
  fields: [
    { name: 'icon', label: 'Icon', type: 'icon', value: 'star', options: [
      { value: 'star', label: 'Star' },
    ] },
    { name: 'content', label: 'Content', type: 'tinymce', mode: 'simple', value: '<p>Hello</p>' },
  ],
  onSubmit: ({ icon, content }) => console.log(icon, content),
});
```

`input-select` combines a text or number input with an adjacent select. Use
`inputType: 'text'` (the default) or `inputType: 'number'`, and provide
non-empty, uniquely valued options. `selectLabel` supplies the list's accessible
name independently from the visible field label.

```js
{
  name: 'weight',
  label: 'Weight',
  type: 'input-select',
  inputType: 'number',
  min: 0,
  step: '0.1',
  selectLabel: 'Weight unit',
  value: { input: '7', selected: 'kg' },
  options: [
    { value: 'kg', label: 'Kilograms' },
    { value: 'g', label: 'Grams' },
    { value: 'mg', label: 'Milligrams' },
  ],
}
```

The field submits `{ input: string, selected: string }`, including for numeric
inputs. Both elements support `disabled`. `required` requires both a value and
a selection. Number inputs accept `min`, `max`, and `step`; text inputs accept
`minLength` and `maxLength`. `validate` receives the combined value. Standard
help, errors, `visibleWhen`, and group behavior apply to the complete control.

The same field can combine descriptive text with a state:

```js
{
  name: 'task',
  type: 'input-select',
  label: 'Task',
  selectLabel: 'Status',
  value: { input: 'Request quote', selected: 'pending' },
  options: [
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
  ],
}
```

Icon options contain a string value and label. Rendered values may be standard
keys from `iconAliases` or Font Awesome classes. The example extension builds
its gallery from all standard keys in `iconAliases`. The icon field submits the
chosen key; TinyMCE submits HTML.
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
The editor build copies the complete TinyMCE distribution to
`src/ui/vendor/tinymce/`; the static build includes it with `src/`. Run
`npm run build:editor` before deploying `src/` directly. Font Awesome Free
resources and their license are included under `src/ui/assets/fontawesome/`.

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

## File explorer activity

`FileExplorerProvider`, `createFileExplorer`, and `registerFileExplorer` provide
a reusable primary-sidebar file explorer. The provider adapts Edy to a host's
filesystem, CMS, object store, or other source; Edy does not access files
directly.

```js
import { FileExplorerProvider, registerFileExplorer } from '@edy/core';

class ProjectFiles extends FileExplorerProvider {
  constructor(project) {
    super({
      createFile: true, createFolder: true, rename: true,
      delete: true, move: true, replace: true,
    });
    this.project = project;
  }

  async list(folderId, { signal }) {
    return this.project.list(folderId, { signal });
  }

  async createFile(folderId, file, { signal }) {
    await this.project.upload(folderId, file, { signal });
  }

  async createFolder(parentId, name, { signal }) {
    await this.project.createFolder(parentId, name, { signal });
  }

  async rename(id, name, { signal }) {
    await this.project.rename(id, name, { signal });
  }

  async delete(id, { signal }) {
    await this.project.delete(id, { signal });
  }

  async move(id, destinationFolderId, { signal }) {
    await this.project.move(id, destinationFolderId, { signal });
  }

  async replace(id, replacement, { signal }) {
    await this.project.replace(id, replacement, { signal });
  }

  async getUrl(id, { signal }) {
    return this.project.getUrl(id, { signal });
  }
}

registerFileExplorer(context, {
  id: 'project-files',
  title: 'Project files',
  provider: new ProjectFiles(project),
  accept: ['image/*', '.pdf'],
  maxFileSize: 10 * 1024 * 1024,
  clickBehavior: 'select',
  viewDestination: 'editor',
  operations: { view: true, delete: false },
  onOpen: (item, { url, intent, destination }) => {
    openProjectFile(item, url, { intent, destination });
    return 'host';
  },
  customOperations: [{
    id: 'share',
    label: 'Share',
    execute: (item, { signal }) => project.share(item.id, { signal }),
  }],
});
```

`list(parentId, { signal })` returns an array of entries:
`{ id, name, type: 'file' | 'folder', size?, mimeType? }`. Use `null` for the
provider root. IDs are opaque and stable; Edy passes them back to provider
methods and does not interpret paths. `getUrl(id, { signal })` returns a URL or
string. The default viewer safely displays supported images, audio/video, PDF,
and text formats. URLs with credentials and schemes other than HTTP(S)/blob
are rejected. `viewDestination: 'editor'` opens a viewer tab; `'dialog'` opens
it in a floating Edy dialog. `onOpen(item, { url, intent, destination })` may
return `'default'` to use that viewer or `'host'` to let the host handle the
file. The callback also runs for the configured click behavior `'open'`.
`clickBehavior: 'select'` selects a file by default; `'open'` delegates the
single click to `onOpen`. When `operations.view` is enabled, double-clicking a
file performs the separate `view` intent. `canView(item)` can restrict that
operation per file or authorize a host-specific viewer.

`FileExplorerProvider` supplies optional mutation methods that reject by
default. Declare implemented operations as `true` in its constructor
capabilities. Supported mutations are `createFile`, `createFolder`, `rename`,
`delete`, `move`, and `replace`; `operations` can further disable them.
`readOnly: true` disables every mutation. The UI only offers operations enabled
by both the provider and configuration, but the provider must still authorize
and validate every request. In particular, it must prevent moving a folder
into its descendants and reject destination name conflicts.

The overflow menu offers supported per-entry operations and optional
`customOperations`. Each custom operation has an `id`, `label`, optional icon,
optional `visible(item)` and `enabled(item)` predicates, and an
`execute(item, { signal, replace })` callback. The `replace(data)` callback
submits editor-provided content through the provider's `replace` method.
`replace` also supports selecting an uploaded replacement file. Providers
receive `{ source: 'upload' | 'edited-content', data }` and decide how to store
it. Folder rows expand lazily into a tree; files and folders can be moved by
drag-and-drop or the move operation.

`accept` is an optional array of MIME types, MIME wildcards, or filename
extensions, and `multiple` allows selecting more than one file per upload.
`maxFileSize` is an optional per-file limit in bytes. Edy checks these settings
for user feedback; the provider must enforce actual file types and size limits.
The host can also use the `replaceEdited(id, data)` method returned by
`createFileExplorer`. Edy does not impose a storage model or generate file URLs.

## Preview frame

`createPreviewFrame({ src, title, allowedOrigin, sandbox, operations,
validateMessage })` returns `{ element, postMessage, onMessage, dispose }`.
`onMessage` returns a disposable subscription. `postMessage` accepts an object
with an allowed `operation` and optional object `payload`; outgoing messages
are limited to 64 KiB. See [live preview](./preview.md).
