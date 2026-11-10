# 001: Can a partner build a theme, plugin or widget outside our repo?

**Listed:** Yes. **Result here:** Yes, confirmed.

## What

This whole repository is the proof: the `spp-customization` theme lives in its own GitHub repo
(`mayur-mate-amla/spp-customization`), separate from the webstore repo. It builds with the published SDK
(`znode-plugin` from npm) and installs into the store's plugin folder without a store build.

## Where

- `package.json`: the only Znode dependency is `znode-plugin` (npm); no path into the store repo
- `znode.local.json` (git-ignored, per machine): where the store's plugin folder is
- `tsconfig.store.json` (git-ignored, optional): the store's types for editor help only

## How to check

```bash
git remote -v
npm ls --depth=0
npm run deploy
```

`output.txt` has what these printed; `evidence.png` is the same as an image. The deploy line
`installed theme spp-customization@1.0.0` shows the package went into the store's plugin folder.
