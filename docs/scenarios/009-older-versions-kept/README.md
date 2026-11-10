# 009: Are older package versions kept on disk for rollback?

**Listed:** Yes. **Result here:** Partial. The older version's **zip** and the **registry history** are kept; its
code files are **removed** from the store's plugin folder when the new version installs.

## What changed

The theme moves from 1.0.0 to 1.0.1 (`package.json`, `znode-package.json`) and is deployed.

## What the store's plugin folder keeps

| Kept | Removed |
| --- | --- |
| `spp-customization-1.0.0-font-inter-*.woff2` (asset) | `spp-customization-1.0.0.server.mjs` |
| `spp-customization-1.0.0.*.mjs.map` (source maps) | `spp-customization-1.0.0.browser.mjs` |
| | `spp-customization-1.0.0.css`, `.labels.json` |

The SDK removes the previous version's server, browser, labels, styles and pages files on install
(`node_modules/znode-plugin/lib/znode-package.mjs`, around line 470). What survives for a rollback:

- `releases/spp-customization-1.0.0.zpkg.zip`: the packed older version, in this project (git-ignored, so on the
  machine that built it)
- `<plugin folder>/.history/plugins-<time>.json`: the registry before each install (the last 50)

Rolling back with the zip: see 010.

## Where

- `package.json`, `znode-package.json`: `"version": "1.0.1"`

## How to check

`output.txt` / `evidence.png`: the theme's files in the plugin folder before the deploy (1.0.0), the deploy, the files
after (1.0.1, with what is left of 1.0.0) and the registry entry (version 1.0.1).
