# 006: Is a package validated at install (name, version, API version, files, file types, size)?

**Listed:** Yes. **Result here:** Yes, confirmed: 8 of 8 broken packages refused, the good one installs.

## What

`znode install` checks a package before it writes anything to the store's plugin folder. Each broken copy below
changes one thing in this theme's real zip:

| Case | Change | Refused with |
| --- | --- | --- |
| bad-name | `"name": "Spp Customization"` | name must be lowercase letters, digits and dashes |
| bad-version | `"version": "1.0"` | version must be semver (1.2.3) |
| bad-kind | `"kind": "skin"` | kind must be one of theme, plugin, widget, content |
| bad-api-version | `"apiVersion": 99` | apiVersion 99 isn't supported (this store runs 1) |
| missing-file | manifest names a browser file not in the zip | names "...missing.mjs", which isn't in the package |
| file-type | adds `install.exe` | file type not allowed |
| folder | adds `nested/evil.css` | a package is flat, no folders |
| too-big | adds an 11 MB file | package is 11611473 bytes; the limit is 10485760 |


## How it renders

**In the webstore (base):** No page render: this happens in the build / install step, before any request.

**How this customization joins it:** `znode install` validates before writing anything ([§1 step 2](../../RENDER-FLOW.md#1-from-this-repository-to-the-store-install-registry))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

- `scripts/bad-packages.mjs` (new): makes the broken copies from `releases/spp-customization-1.0.0.zpkg.zip`
- Rules: `node_modules/znode-plugin/lib/znode-package.mjs` (manifest checks and the install's file checks)

## How

```bash
npm run pack
node scripts/bad-packages.mjs releases/spp-customization-1.0.0.zpkg.zip <outDir>
npx znode install <outDir>/bad-version.zpkg.zip <an empty scratch plugin folder>
```

Installed into an **empty scratch plugin folder**, never the store's. `output.txt` / `evidence.png`: every case with
its message and exit code 1, then the good package installing with exit code 0.
