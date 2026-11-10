# 002: Is there one package format for themes, plugins, widgets and content (znode-package.json)?

**Listed:** Yes. **Result here:** Yes, confirmed.

## What

One manifest, `znode-package.json`, describes every package. Its `kind` says what it is: `theme`, `plugin`,
`widget` or `content`. Everything else (build entry points, styles, assets, labels, widgets, pages, settings,
permissions) uses the same fields whatever the kind; `parent` is the one field only a theme may have.

## How it renders

**In the webstore (base):** No page render: this happens in the build / install step, before any request.

**How this customization joins it:** `znode-package.json` (`kind`) is what the SDK builds and what the registry entry is made from ([§1](../../RENDER-FLOW.md#1-from-this-repository-to-the-store-install-registry))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

- `znode-package.json`: `"kind": "theme"`, `"apiVersion": 1`, `build`, `styles`, `assets`, `messages`, `widgets`,
  `serverPages`, `settingsSchema`, `permissions`
- SDK rules: `node_modules/znode-plugin/lib/znode-package.mjs` (`KINDS = ["theme", "plugin", "widget", "content"]`)

## How to check

```bash
npm run check
```

`znode check` reviews the manifest against the code (metadata, permissions, settings, sizes): 0 errors, 0 warnings.
`output.txt` / `evidence.png` hold the output.
