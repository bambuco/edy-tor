# Development and deployment

## Commands

From the root folder:

```sh
npm install
npm test
npm run docs
npm run build
```

Edit Markdown in `docs/`. `npm run docs` regenerates the HTML site under
`help/`; `npm run build` always regenerates it and copies both directories to
`dist/`. Open `/help/` through the development server. Keep source Markdown
links relative and use `.md`; generated internal links point to `.html`.
The help navigation follows the links in the `Get started` list in
`docs/index.md`, with the index first. Pages not listed there are appended
alphabetically. The header and navigation remain visible while the content
scrolls; on narrow screens a menu button opens the navigation.

The static build also copies modules, styles, examples and the license to
`dist/`, and reports compressed core size in `dist/build-report.json`.
Deploy the contents of `dist/` to a static HTTP server. The examples require
the same relative layout as the build output.

## Integration checklist

- Mount a dedicated container with an explicit size and dispose it on teardown.
- Supply only the host services trusted extensions need.
- Use a separate origin for previews that preserve their origin.
- Test browser support, keyboard shortcuts, translations and accessibility in
  the target application.
- Read [installation](./installation.md), [extensions](./extensions.md) and
  [preview security](./preview.md) before deploying.
