# 005: Are partner docs and examples available?

**Listed:** Yes. **Result here:** Yes, confirmed.

## What

- **SDK README** (`node_modules/znode-plugin/README.md`, also on npm): getting started, connecting a project to a
  store, every command, preview and going live, imports.
- **Project README** (`README.md`, written by `create-znode-plugin`): the commands and a table of *where each
  customization goes*, each with a working example in `src/`.
- **Working examples** in `src/`: a server layout (`ThemeLayout.tsx`), a server page (`WelcomePage.tsx`), an API route
  (`server.tsx` → `highlights`), two slots (`AnnouncementBar.tsx`, `ProductBadge.tsx`), a page-builder widget
  (`Hero.tsx`), a Google font (`fonts.ts`), styles, labels and an asset.
- **Starters by kind**: `znode create <kind> <name>` (see 022).

## How it renders

**In the webstore (base):** No page render: this happens in the build / install step, before any request.

**How this customization joins it:** documentation only

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

`node_modules/znode-plugin/README.md`, `README.md`, `src/`

## How to check

`output.txt` / `evidence.png`: the section headings of both READMEs and the example files.
