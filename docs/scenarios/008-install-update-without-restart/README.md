# 008: Can I install or update a package without a build or restart?

**Listed:** Yes. **Result here:** Yes, confirmed.

| Before | After |
| --- | --- |
| ![before](before.png) | ![after](after.png) |

## What changed

The announcement bar gets a **Learn more** link to the theme's welcome page (`/spp-customization-welcome`). The
update went live by running `npm run deploy` and refreshing the page: no webstore build, no restart. The webstore
process listening on port 3000 is the same before and after (pid 21432, started 12:17:11).

## How it renders

**In the webstore (base):** the layout JSON's header item → agent `getHeaderInitialDetails` (portal logo, mega-menu categories) → `HeaderRender` → `Header` (`<header id="webstore-header">`) ([§8 A](../../RENDER-FLOW.md#8-header-footer-search))

**How this customization joins it:** `npm run deploy` rewrites `plugins.json`; the store re-reads it by modification time ([§1 step 3](../../RENDER-FLOW.md#1-from-this-repository-to-the-store-install-registry)); the manifest's file URLs carry `?v=<mtime>` so browsers fetch the new bundle ([§3 B.2](../../RENDER-FLOW.md#3-the-page-shell-root-layout-head-styles-labels-server-layout)); `HeaderRender` → `RuntimeHeader` → `<RuntimeSlot name="layout.header">`: the theme's `AnnouncementBar` slot gets the store's header as `children` and renders its bars around it ([§8 B](../../RENDER-FLOW.md#8-header-footer-search))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

- `src/slots/AnnouncementBar.tsx`: the text in a `<span>`, plus a `next/link` to `/spp-customization-welcome`
  (`data-test-selector="linkAnnouncement"`)
- `src/styles/theme.css`: the bar is a centered flex row; `.spp-customization-announcement__link` (white, bold,
  underlined)

## How

1. `npm run deploy`: builds, packs and installs into the store's plugin folder (about 4 s). The store re-reads
   `plugins.json` when it changes and loads the new files.
2. Refresh the page.

`output.txt` / screenshots: the webstore process id and start time before and after the deploy (unchanged), the
deploy output, and the page before and after (`node scripts/shot.mjs --path / --height 420`).
