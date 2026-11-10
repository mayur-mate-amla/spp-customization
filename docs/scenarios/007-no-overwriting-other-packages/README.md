# 007: Is a package prevented from overwriting another package's files?

**Listed:** Yes. **Result here:** Not fully. Code, styles, labels and pages are protected, but **assets (images,
fonts) are not**: another package can overwrite them without any error. Fixing it needs a change in the `znode-plugin`
SDK, so this row is marked ⛔ in `SCENARIOS.md`.

## What was tested

All packages share one flat plugin folder. `znode install` knows which package owns each file from `plugins.json`
and refuses a package carrying one of them, **but only for the files an entry names**: `file`, `browser`,
`messages`, `styles`, `pages`. Entries do not record `assets` at all.

| Test (scratch copies, never the store's folder) | Result |
| --- | --- |
| This theme's zip plus a file named `apex-1.0.19.css` (Apex's stylesheet) | Refused: `"apex-1.0.19.css" belongs to package apex` |
| Another package, `spp-rival`, whose assets include `spp-customization-hero.svg` (this theme's image) | **Installed**; the image went from 551 to 110 bytes (overwritten) |

## What it needs (outside this repo)

In `znode-plugin/lib/znode-package.mjs`:

1. Record the package's assets in its registry entry (`assets: [...]`).
2. Add them to the owners map (line 428: `...(item.assets || [])`), so the existing `belongs to package` check
   covers them.

This repo's `npm run uninstall` (011) already works around the missing record by reading the package's own zips.

## Where

No code change. Tests: `scripts/bad-packages.mjs` case `other-package-file`, and a two-file `spp-rival` package made in
a scratch folder.

## How to check

`output.txt` / `evidence.png`: both tests and the SDK line that builds the owners map.
