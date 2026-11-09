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
      icon: '★',
      shortcut: 'Ctrl+Shift+H',
      commandId: 'hello',
    });
    context.views.register('explorer', {
      title: 'Explorer',
      icon: '▤',
      location: 'primary',
      render: () => document.createTextNode('My project'),
    });
  },
};
```

Pass `extensions: [tools]` to `createEdy`. Views use `primary`, `secondary`,
`panel`, `editor` or `preview` locations. Renderers return a DOM node or
`{ element, dispose }`. Open a view with `context.views.open('explorer')`.
Primary activity buttons use the provided short icon, or the title's first
character if no icon is provided.

Instead of `render`, a primary view may provide `sections`, an array of
`{ id, title, render, height, collapsed, actions }`. The accordion fills the
sidebar, allows each section to collapse, and exposes pointer and keyboard
resize handles. `height` is a relative initial size (default `1`).
Section renderers return a DOM node or `{ element, dispose }`. Actions use
`{ icon, label, onClick }` or `{ icon, label, menu: [{ label, onClick }] }`;
action failures are reported through the editor's notifications.

Menu items may define string `icon` and `shortcut` properties. Shortcuts use
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

See [live preview](./preview.md) and [API reference](./api.md).
