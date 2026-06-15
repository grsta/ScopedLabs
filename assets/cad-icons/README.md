# ScopedLabs CAD Icons

Global shared CAD icon registry for ScopedLabs visual renderers.

This folder is intentionally category-neutral. Access Control keeps its existing category-specific visual file for now. New tools can reference global icons by stable IDs.

## Runtime

```js
window.ScopedLabsCadIcons.renderIcon("global.proof-marker", {
  x: 80,
  y: 120,
  tone: "watch",
  markerId: "*1"
});
```

## Registry requirements

Each icon record should include:

- `id`
- `label`
- `category`
- `description`
- `tags`
- `viewBox`
- `tones`
- `version`
- `render(options)`

## Dashboard future

A future icon dashboard can use:

```js
window.ScopedLabsCadIcons.listIcons()
window.ScopedLabsCadIcons.renderIcon(id, options)
```

to browse, preview, copy, and audit shared icons.
