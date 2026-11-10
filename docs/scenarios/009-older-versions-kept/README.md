# 009: Are older package versions kept on disk for rollback?

**Listed:** Yes. **Result here:** Yes, every deployed version is kept next to the store and can be reinstalled with
one command.

## What changed

`znode install` removes the previous version's server, browser, CSS and labels files from the plugin folder when a new
version installs (`node_modules/znode-plugin/lib/znode-package.mjs`, around line 470). So the store's folder alone
could not roll back. Now `npm run deploy` also keeps each packed version **next to the store**:

```
<plugin folder>/.versions/spp-customization/
  spp-customization-1.0.1.zpkg.zip
  spp-customization-1.0.2.zpkg.zip
```

and `npm run rollback -- <version>` reinstalls one of them (010). This works from any machine that can reach the
plugin folder, without this project's `releases/`. The store serves only flat file names from its plugin folder, so
nothing under `.versions/` is ever sent to a browser.

The theme is now at version 1.0.2.

## Where

- `scripts/deploy.mjs` (new): `npx znode deploy .`, then copies `releases/<name>-<version>.zpkg.zip` to
  `<plugin folder>/.versions/<name>/`
- `scripts/lib/store.mjs` (new): package name, plugin folder, `.versions` folder, and the registry lock/history/
  atomic write shared by the scripts (`registry.mjs` now uses it)
- `scripts/rollback.mjs`: reads versions from `.versions/` first, then `releases/`
- `package.json`: `"deploy": "node scripts/deploy.mjs"`; version 1.0.2 (`znode-package.json` too)

## How to check

```bash
npm run deploy            # 1.0.1, kept
# version -> 1.0.2
npm run deploy            # 1.0.2, kept: 2 versions on disk
npm run rollback          # lists them (releases/ moved away for this test)
npm run rollback -- 1.0.1
npm run rollback -- 1.0.2
```

`output.txt` / `evidence.png` hold the run, including a version that was never kept being refused.
