# 011: Can a package be uninstalled cleanly (files removed)?

**Listed:** Partial. **Result here:** Yes, with `npm run uninstall`.

## What changed

The `znode` command has no uninstall, and removing a package's entry from `plugins.json` by hand leaves all its files
behind. The registry does not even list a package's assets (images, fonts). `npm run uninstall` now removes the package
cleanly:

1. Takes the registry lock (as `znode install` does), keeps a copy in `.history/`, removes the package's entry (and any
   `installations` records for it), and writes `plugins.json` atomically.
2. Deletes every file the package owns in the plugin folder:
   - the files its entry names (server, browser, labels, styles, pages) and their `.map` files
   - every file in its own zips (`.versions/<name>/`, `releases/`), which covers assets the registry does not list
   - older versions' leftovers, `<name>-<semver>...` (fonts and maps the install leaves)
3. Never deletes a file another package's entry names.
4. Keeps `.versions/<name>/` for a reinstall or rollback; `npm run uninstall -- --purge` removes it too.

Run on a **scratch copy** of the store's plugin folder (its `plugins.json`, this theme's files, the Apex theme's files
and `.versions/`), with this project's `releases/` moved away:

- entries 25 → 24; the `spp-customization` entry is gone
- 14 files deleted: 1.0.2's code, CSS, labels and maps, the hero image, and 1.0.0 / 1.0.1 leftovers
- every Apex file still there
- `--purge` removes `.versions/spp-customization/`

## Where

- `scripts/uninstall.mjs` (new)
- `package.json`: `"uninstall": "node scripts/uninstall.mjs"`
- Uses `scripts/lib/store.mjs` (lock, history, atomic write) and `adm-zip` from the SDK to read the zips

## How to check

```bash
RUNTIME_PLUGINS_DIR=<a copy of the plugin folder> npm run uninstall
RUNTIME_PLUGINS_DIR=<a copy of the plugin folder> npm run uninstall -- --purge
```

`output.txt` / `evidence.png` hold the run.
