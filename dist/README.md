# Edy

Edy is a framework-free, embeddable visual-editor workbench. Its core provides a
workbench, extension API, generic controls, localization, and host-service
contracts. Project-specific file formats, persistence, and export behavior
belong to trusted extensions.

Copyright: 2026 David Herney - [BambuCo](https://bambuco.co)\
License: [GNU GPL v3 or later](./LICENSE)

## Requirements and commands

- Node.js 20+ is used only for the development server, static build, and tests.
- Production pages use native browser ES modules and do not require Node.

From this directory:

```sh
npm install
npm start
npm test
npm run docs
npm run build
```

Open `http://127.0.0.1:4173/` for the standalone example or
`http://127.0.0.1:4173/examples/host/` for the host integration with two
independent instances. Open **Split preview** and edit the example document to
see a sandboxed opaque-origin preview in `examples/preview/`. The server binds to localhost;
set `PORT` to choose another port.
The preview toolbar demonstrates optional logical sizes, extension-defined
presets, and automatic or manual scaling. See [preview integration](./docs/preview.md).
The activity bar includes **Explorer** and **Quick access** as examples of
switching between primary sidebar views.
The **Sample tools** view demonstrates a local TinyMCE field and a configurable
Font Awesome Free icon selector. See the [API reference](./docs/api.md) for
configuration, runtime deployment, and licensing notes.

Developer guides are in [docs/](./docs/index.md); `npm run docs` converts them
to the navigable HTML site in [help/](./help/index.html). The build regenerates
the help automatically.

The static build is written to `dist/`. `dist/build-report.json` records gzip
size of the core JavaScript modules and essential CSS against the proposed
150 KiB budget.

## Host integration

Mount Edy into a dedicated host element. Each instance owns a shadow root,
registries, theme, locale, notifications, and extension lifecycle.

```js
import { createEdy } from './src/index.js';
import { demoExtension } from './src/extensions/demo.js';

const editor = createEdy({
  container: document.querySelector('#editor'),
  locale: 'en',
  theme: 'system',
  logo: '/images/my-editor-logo.svg', // Optional; omit to use the bundled Edy logo.
  services: {},
  extensions: [demoExtension],
});

await editor.start();

// When the host view closes:
await editor.dispose();
```

Use separate container elements for multiple instances. A container must not
already have a shadow root. Supported locale values are `en` and `es`; themes
are `light`, `dark`, and `system`. Once `dispose()` resolves, the same host
element can be mounted again with a new instance.
The optional `logo` image URL is resolved relative to the host page and can
be different for each instance. Keep `src/assets/` when deploying the default
logo; its source and licensing note are in [image credits](./src/assets/CREDITS.md).

## Extension contract

Extensions are trusted page code. Registration and Web Components are not
security boundaries. Only pass services an extension needs, and never pass host
credentials to preview content.

```js
export const extension = {
  id: 'example.tools',
  apiVersion: '1',
  requires: [],

  async activate(context) {
    context.commands.register('hello', {
      label: 'Say hello',
      execute: () => context.notifications.info('Hello'),
    });
    context.views.register('tools', {
      title: 'Tools',
      location: 'primary',
      render: () => document.createElement('section'),
    });
    context.menus.register('view', {
      id: 'tools',
      label: 'Open tools',
      commandId: 'hello',
    });
  },

  async deactivate() {},
};
```

Contribution identifiers are scoped to an extension and collisions are errors.
`apiVersion` must match the supported version. Locations are `primary`,
`secondary`, `panel`, `editor`, and `preview`. View render functions return DOM nodes,
never HTML strings. A view may return `{ element, dispose }` when it owns
render-time resources; Edy calls `dispose()` when that contribution is
unmounted. Registrations return disposable resources and are also
released automatically when their extension deactivates. Extensions can add
extra resources with `context.subscriptions.push({ dispose() {} })`.
Primary views appear as icon-only activity buttons; their titles are available
as native hover tooltips and accessible names. Supply a short string `icon`, or
the first character of the title is used.
Command availability is controlled by its `enabled` boolean; update it and call
`commands.refresh()` to update menus and status actions.

Available context services are:

- `commands.register(id, { label, execute, enabled })`, `commands.execute(id, ...args)`, and `commands.refresh()`
- `views.register(id, { title, location, render })` and `views.open(id)`
- `documents.open(id, { title, render })` and `documents.close(id)`
- `menus.register(menuId, { id, label, commandId, icon, shortcut, order })`; use `context` for right-click actions
- `status.register(id, { label, tooltip, onClick })`
- `notifications.info(message)`, `success(message)`, and `error(error, message)`
- `ui.confirm(message)`
- `services`, containing only capabilities explicitly provided by the host

The extension `requires` array lists required keys from host `services`.
Activation fails explicitly if a required service is missing or the API version
does not match. Failed commands and renderers are logged and surfaced in an
accessible notification.

## UI controls and workbench behavior

The public API exports `createButton`, `createLink`, `createBadge`,
`createMessage`, `createProgress`, `createSeparator`, `createForm`, `createList`,
`createTabs`, `confirmDialog`, and `createPreviewFrame`. Forms use field
descriptors with native input types, radio groups, required values, custom
validation, conditional visibility, helper text, disabled states, checkboxes,
switches, selects, text areas, and accessible errors.

The workbench includes primary and secondary sidebars, an editor surface with
tabs, an optional split preview, a bottom panel, status bar, extension menus,
keyboard/pointer resize
handles, live notifications, and light/dark/system themes. The host can style
the container but Edy's component styles do not leak outside its shadow root.
The expand control fills the browser viewport and can be exited with Escape.
Edy does not change global styles or install globals.

## Preview security

`createPreviewFrame` applies a sandbox, disables referrer transmission, checks
the exact message source and configured origin, and accepts only explicitly
listed operations with object payloads. Outgoing messages are limited to
64 KiB; validate incoming payloads and their size using `validateMessage`.
For an opaque-origin sandbox, messages arrive with origin
`"null"` and are checked against the exact iframe window. To preserve an origin,
the helper requires an explicit origin matching a different-origin preview URL;
it rejects `allow-same-origin` for same-origin content. Use a separate origin
when the preview contains untrusted executable content; an iframe alone is not
a trust boundary. Do not send credentials or unrestricted host capabilities.

## Accessibility and browser support

Controls use native semantic elements, visible focus, labels, accessible errors,
keyboard-operable actions, and reduced-motion preferences. Dialogs use the
browser's modal dialog behavior and restore prior focus. The layout adapts to
narrow screens. Validate supported browser versions in the integrating
application; the initial target is current Chromium and Firefox.
