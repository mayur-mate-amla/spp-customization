# 017: Can a package declare which API version it needs?

**Listed:** Yes. **Result here:** Yes, confirmed, and checked twice.

## What

The package says which extension API it is built for in two places, and each is checked:

| Where it is declared | Who checks it | When it does not match |
| --- | --- | --- |
| `znode-package.json` → `"apiVersion": 1` | `znode install` | Refused: `apiVersion 99 isn't supported (this store runs 1)` |
| `src/server.tsx` → `apiVersion: 1` (the server part) | The webstore when it loads the bundle (`registry.server.ts`) | The server part is not loaded |

The store's version is `EXTENSION_API_VERSION = 1` (`packages/extensions/src/types.ts` in the store repo).

## Where

No code change: `znode-package.json` and `src/server.tsx` already declare version 1. The refused package is the
`bad-api-version` case of `scripts/bad-packages.mjs` (006), installed into an empty scratch folder.

## How to check

`output.txt` / `evidence.png`: both declarations, the refused install, and the two lines of store code that hold and
check the version.
