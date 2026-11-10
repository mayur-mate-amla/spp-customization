# 007: Is a package prevented from overwriting another package's files?

**Listed:** Yes. **Result here:** Yes, confirmed.

## What

All packages share one flat plugin folder, so a file name could clash. The install knows which package owns each
file (from `plugins.json`) and refuses a package that carries a file another package owns.

Test: this theme's zip with an extra file named `apex-1.0.19.css` (the Apex theme's stylesheet), installed into a
**scratch copy** of the store's `plugins.json`:

```
znode-package: "apex-1.0.19.css" belongs to package apex
(exit 1)
```

Nothing is written; the Apex file stays as it is.

## Where

- `scripts/bad-packages.mjs` case `other-package-file`
- Rule: `node_modules/znode-plugin/lib/znode-package.mjs` (`belongs to package`)

## How to check

```bash
node scripts/bad-packages.mjs releases/spp-customization-1.0.0.zpkg.zip <outDir>
npx znode install <outDir>/other-package-file.zpkg.zip <folder holding a copy of plugins.json>
```

`output.txt` / `evidence.png` hold the run.
