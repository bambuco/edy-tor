# Extensions

Extensions are trusted application code. Each has a unique `id`, `apiVersion:
'1'`, optional `requires` array, and an `activate(context)` function. Its
optional `deactivate()` is called on shutdown. Registrations are namespaced to
the extension and automatically disposed. Add other disposables to
`context.subscriptions`.

```js
export const tools = {
  id: 'myapp.tools',
  apiVersion: '1',
  requires: [],
  activate(context) {
    context.commands.register('hello', {
      label: 'Say hello',
      execute: () => context.notifications.success('Hello!'),
    });
    context.menus.register('edit', {
      id: 'hello',
      label: 'Say hello',
      icon: 'star',
      shortcut: 'Ctrl+Shift+H',
      commandId: 'hello',
    });
    context.views.register('explorer', {
      title: 'Explorer',
      icon: 'folder',
      location: 'primary',
      render: () => document.createTextNode('My project'),
    });
  },
};
```

Pass `extensions: [tools]` to `createEdy`. Views use `primary`, `secondary`,
`panel`, `editor` or `preview` locations. Renderers return a DOM node or
`{ element, dispose }`. Open a view with `context.views.open('explorer')`.
Primary activity buttons use the provided icon, or the title's first
character if no icon is provided. Icons may use a standard key such as `robot`
or `card`, a direct Font Awesome class list such as `fa-solid fa-robot`, or a
single-character glyph. Unknown class lists are passed through without
validation. The same values are accepted by menu items and accordion actions.
The public `createIconElement`, `iconAliases`, and `loadIconStylesheet` exports
are available from `src/index.js`. Font Awesome Free styles and webfonts are
distributed with `src/ui/assets/`.

Instead of `render`, a primary view may provide `sections`, an array of
`{ id, title, render, height, collapsed, actions }`. The accordion fills the
sidebar, allows each section to collapse, and exposes pointer and keyboard
resize handles. `height` is a relative initial size (default `1`).
Section renderers return a DOM node or `{ element, dispose }`. Actions use
`{ icon, label, onClick }` or `{ icon, label, menu: [{ label, onClick }] }`;
action failures are reported through the editor's notifications.

Menu items may define `icon` and string `shortcut` properties. Shortcuts use
`Ctrl`, `Alt`, `Shift`, `Meta` and a single character or `F1`–`F12`, for
example `Ctrl+Shift+H`. A shortcut requires a command and must be unique within
an instance. It runs only when keyboard focus is inside that editor; browser
and operating-system reserved keys may not reach Edy. Commands with
`enabled: false` do not execute. Call `context.commands.refresh()` after
changing availability.

`requires` lists keys that the host must supply in `services`; missing
services make activation fail. `context.locale` and `context.translate`
describe the instance language. Translate extension-specific text yourself
when the core dictionary does not contain it.

## Host asset picker

The `asset` form field delegates selection to a picker supplied by the
extension. The recommended host service is `services.assets.pick`, although
an extension can provide another adapter. For example:

```js
// Host application, using its own existing asset manager:
createEdy({
  container,
  services: {
    assets: {
      async pick(request) {
        return hostAssetManager.choose(request);
      },
      async resolvePreview({ id, signal }) {
        return hostAssetManager.preview({ id, signal });
      },
    },
  },
  extensions: [imageTools],
});
```

The contract is `assets.pick({ accept, multiple, currentValue, signal })`:
`accept` is a list of MIME types or wildcard patterns, `multiple` is a
boolean, and `currentValue` contains existing asset IDs. `signal` is an
`AbortSignal`; the picker should close its UI and stop work if aborted.
It resolves to an array of records such as
`[{ id: 'asset-42', name: 'Photo', mimeType: 'image/jpeg' }]`, or `null` when
the user cancels. An empty array represents a confirmed empty selection; for
single selection it contains at most one record. Failures reject rather than
being confused with cancellation. The host checks authorization, MIME types,
and project scope; `accept` is a selection hint, not a security guarantee.

Use `requires: ['assets']` when the service is mandatory for an extension.
An extension can alternatively omit the field when the service is absent,
as the sample extension does. See the [API reference](./api.md) for a
complete `createForm` example. The standalone and host examples both supply
`createDemoAssets` from `examples/assets-demo.js`: its dialog filters simulated
records, preselects current IDs, supports single or multiple choice, and
implements cancellation and abort. It does not read or upload real files.

Stable IDs are preferable to filesystem paths, temporary signed URLs or
credentials in saved form values. The optional `assets.resolvePreview({ id,
signal })` resolves a preview on demand, returning `null` when unavailable or
`{ url, mimeType, dispose? }`. The optional synchronous `dispose` must release
host-owned resources, including object URLs; Edy calls it even for a result
arriving after cancellation. A host should create a fresh disposable resource
per call rather than share a single object URL. For example:

```js
async function resolvePreview({ id, signal }) {
  // Host checks access and selects a safe representation of the asset.
  const { blob, mimeType } = await hostAssetManager.getPreview(id, { signal });
  if (signal.aborted) return null;
  const url = URL.createObjectURL(blob);
  return { url, mimeType, dispose: () => URL.revokeObjectURL(url) };
}
```

The host must authorize every request, verify actual contents and serve the
declared safe representation with the correct Content-Type and
`X-Content-Type-Options: nosniff`. Do not use credentials in URLs. Serve
untrusted documents from a separate origin with restrictive headers, or
convert them to a safe image; the MIME value alone does not make content
safe. HTML and SVG are not rendered by the field. Edy's sandboxed PDF iframe
depends on browser PDF support and is not a substitute for host-side
isolation. Preview URLs are never stored as form values.

An adapter for a CMS, object store, or local asset manager can implement the
same contract; the provider retains responsibility for upload, permissions,
and persistence. The example's images are local illustrations, and its
simulated picker also displays thumbnails.

The form always stores an array of IDs, including for single selection.
`allowClear: false` hides the form's clear action; the host must also enforce
any restriction on confirming an empty selection. The host can route a picker
to different providers through its adapter. Call `form.dispose()` when
permanently unmounting a contribution to abort outstanding requests; stale
results are ignored even if a provider does not honor the signal. Untrusted
previews must not receive the service or host credentials.

See [live preview](./preview.md) and [API reference](./api.md).
