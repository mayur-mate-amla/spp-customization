# 022: Is there a command to scaffold a new package?

**Listed:** No. **Result here:** Yes. The SDK has `znode create <kind> <name> [dir]`, and `npm create
znode-plugin` makes a whole project (the one this repo started from).

## What

`npx znode create` made a starter of each kind:

| Kind | What the starter has |
| --- | --- |
| theme | `znode-package.json`, browser part, tokens and parts CSS, labels, a hero widget, `build-and-upload.sh` |
| plugin | `znode-package.json`, browser part, server part, `build-and-upload.sh` |
| widget | `znode-package.json`, browser part, one widget, `build-and-upload.sh` |
| content | `znode-package.json`, a page (`src/pages/landing.json`), `build-and-upload.sh` |

Each also gets a copy of `extension-api.d.ts`. An unknown kind is refused. `znode check` on a fresh starter fails only
because its placeholder publisher and description are still in place, as intended.

## Two ways to start a package

| Command | Makes |
| --- | --- |
| `npm create znode-plugin@latest <name>` | A full project: npm scripts, TypeScript config, connection to a store, examples (this repo) |
| `npx znode create <kind> <name> [dir]` | A minimal package of one kind, in any folder |


## How it renders

**In the webstore (base):** No page render: this happens in the build / install step, before any request.

**How this customization joins it:** `znode create` writes a starter package ([§1](../../RENDER-FLOW.md#1-from-this-repository-to-the-store-install-registry))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

No code change. The starters were made in a scratch folder and not kept.

## How to check

`output.txt` / `evidence.png`: the four `create` runs with the files each made, the refused kind, and `znode check` on
the theme starter.
