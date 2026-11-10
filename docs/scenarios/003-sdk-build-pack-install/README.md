# 003: Is there an SDK to build, pack and install a package?

**Listed:** Yes. **Result here:** Yes, confirmed: each step takes about 4 seconds.

## What

The `znode` command from the `znode-plugin` SDK does the whole cycle:

| Step | Command | Result |
| --- | --- | --- |
| Build | `npm run build` (`znode build .`) | Type-check, then server and browser bundles, CSS and fonts into `dist/` |
| Pack | `npm run pack` (`znode pack .`) | `releases/spp-customization-1.0.0.zpkg.zip` |
| Install | `npm run deploy` (`znode deploy .`) | Pack, then install into the store's plugin folder and its `plugins.json` |


## How it renders

**In the webstore (base):** No page render: this happens in the build / install step, before any request.

**How this customization joins it:** build → pack → install ([§1 steps 1-2](../../RENDER-FLOW.md#1-from-this-repository-to-the-store-install-registry))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

- `package.json` scripts `build`, `pack`, `deploy`
- `dist/` and `releases/` (git-ignored build output)
- The store's plugin folder from `znode.local.json`

## How to check

Run the three commands. `output.txt` / `evidence.png` hold their output with timings (about 4.2 to 4.3 s each)
and the files they produced.
