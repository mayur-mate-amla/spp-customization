# 011: Can a package be uninstalled cleanly (files removed)?

**Listed:** Partial. **Result here:** Partial, confirmed. There is no uninstall command; removing the package's
entry from `plugins.json` turns it off for every store, but all of its files stay in the plugin folder.

## What

In an empty **scratch** plugin folder: install 1.0.0, upgrade to 1.0.1, then uninstall by hand (remove the
`spp-customization` entry from `plugins.json`).

- The `znode` command has no `uninstall` (its usage line: `build | pack | check | install | deploy | dev`,
  `create`, `link-store`).
- After the entry is gone, all 11 files are still on disk: the 1.0.1 code, CSS, labels and maps, the hero image, and
  what 1.0.0 left behind (its font and maps, see 009).
- The store serves only files a registry entry names, so the leftovers are not used; they just take space.

## Clean uninstall, by hand

1. Switch the package off first (`"enabled": false`) so no page uses it while you work.
2. Remove its entry from `plugins.json`.
3. Delete the files the entry named (`file`, `browser`, `styles`, `messages`, `assets`) and their `.map` files, plus
   older versions' leftovers (`spp-customization-<old version>-*`).

## Where

No code change. The test ran in a scratch folder, never the store's plugin folder.

## How to check

`output.txt` / `evidence.png`: the SDK's commands, the install and upgrade, the folder listing, the entry removed and
the listing again.
