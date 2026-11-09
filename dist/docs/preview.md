# Live preview

Register a view with `location: 'preview'` to make the **Split preview** button
available. It opens a second surface next to the active editor; narrow screens
stack the two surfaces. Extensions own the document model, preview renderer,
and synchronization. `context.views.open('preview-id')` opens a registered
preview programmatically. If several preview views are registered, users can
select them in the preview pane.
The editor and preview scroll independently, while editor tabs remain visible.

## Optional size and scale controls

Set `viewport` on a preview view to let Edy wrap its rendered node in a
configurable logical viewport. Width and height are CSS pixels; visual zoom
does not change them. Automatic scaling fits both dimensions into the available
space without enlarging above 100%. Manual scaling uses a percentage and
provides scrollbars when the scaled viewport exceeds the space available.
Size choices are supplied and named by the extension, not by Edy:

```js
context.views.register('preview', {
  title: 'Preview',
  location: 'preview',
  viewport: {
    width: 1024, height: 768, scale: 'auto',
    minWidth: 200, maxWidth: 4096,
    minHeight: 100, maxHeight: 4096,
    minScale: 25, maxScale: 200,
    presets: [
      { id: 'phone', label: 'Phone', width: 375, height: 667 },
      { id: 'desktop', label: 'Desktop', width: 1024, height: 768 },
    ],
    onChange: ({ width, height, scale }) => {
      console.log(width, height, scale);
    },
  },
  render: () => createPreviewFrame({
    src: '/my-preview.html',
    title: 'Preview',
    allowedOrigin: 'null',
    operations: [],
  }),
});
```

`width`, `height`, and limits are positive integers. Defaults are 1024 × 768,
width limits 200–4096, height limits 100–4096 and manual scale limits 25–200%.
`scale` is `'auto'` or an integer percentage within its limits. Preset IDs
must be unique and dimensions must satisfy the limits. Invalid configuration
is rejected at registration; UI values outside the limits are rejected.
`onChange` runs after user changes and receives the logical dimensions and
`'auto'` or the manual percentage; automatic adjustments due to container
resizing do not fire it. State is independent per view and instance and is
retained when the preview is closed and reopened while registered.

Return the preview node directly, or `{ element, dispose }` as shown below,
and size its content to fill the viewport. For an iframe, its content viewport
matches the logical dimensions and responsive CSS can react to changes.
This does not emulate device pixel ratio, touch input, browser engines or
other device characteristics. Without `viewport`, existing views retain their
original rendering.

For a sandboxed HTML preview, import `createPreviewFrame` from `src/index.js`.
Use an explicit operation allowlist and validate messages. The included
`demoExtension` listens for preview readiness and forwards edited text using
`postMessage`. The frame renders text with `textContent`, never as HTML.

```js
const preview = createPreviewFrame({
  src: '/my-preview.html',
  title: 'Preview',
  allowedOrigin: 'null',
  operations: ['ready', 'update'],
  validateMessage: (message) => message.operation === 'ready',
});
const subscription = preview.onMessage(() => {
  preview.postMessage({ operation: 'update', payload: { text: 'Hello' } });
});
// Return this from a view renderer:
return {
  element: preview.element,
  dispose() {
    subscription.dispose();
    preview.dispose();
  },
};
```

The default sandbox has an opaque origin (`null`); Edy checks the exact frame
window and allowed message operations. If using `allow-same-origin`, the
preview must be served from a different origin and `allowedOrigin` must match
its URL. Never send credentials or unrestricted host services into a preview.
Preview code must validate messages from its parent as well. Limit payload
sizes and treat all preview content as untrusted.
