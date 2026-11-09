# Edy developer documentation

<img src="../src/assets/edy-logo.svg" alt="Edy logo" width="80" height="80">

Edy is an embeddable workbench for visual-editor extensions. It supplies
isolated instances, UI surfaces, controls and preview messaging; your
application and trusted extensions own document formats, persistence and
project-specific editing.

## Get started

- [Installation and integration](./installation.md): run the examples and mount an editor.
- [Extensions](./extensions.md): register views, commands, menus and documents.
- [Live preview](./preview.md): display extension-owned content alongside an editor.
- [API reference](./api.md): configuration and exported controls.
- [Development and deployment](./development.md): tests, builds and HTML help.

The [standalone example](../examples/standalone/index.html) demonstrates a
sample extension. Its sample document can be edited while **Split preview** is
open. [Host integration](../examples/host/index.html) demonstrates two
independent instances.

## Credits and license

Edy is copyright 2026 David Herney - BambuCo and is distributed under the
[GNU GPL v3 or later](../LICENSE). The Edy logo uses the supplied
`dick-svgrepo-com.svg` from the
[Tiny People Avatar Vectors collection on SVG Repo](https://www.svgrepo.com/collection/tiny-people-avatar-vectors/).
The image is openly licensed for distribution with attribution. See
`src/assets/CREDITS.md` for the asset attribution.
