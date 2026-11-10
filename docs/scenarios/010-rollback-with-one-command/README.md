# 010: Is there a one-command rollback?

**Listed:** No. **Result here:** Yes for this package: `npm run rollback -- <version>`, as long as that version's
zip is in `releases/`.

## What changed

A rollback script. `znode install <older zip>` already replaces the installed version and keeps the store's
`enabled`, `stores` and settings, so a rollback is one install of the older zip; the script finds that zip by version.

```
$ npm run rollback -- 1.0.0
installed theme spp-customization@1.0.0 (was 1.0.1): 8 files, disabled for []
```

Without a version it lists the versions it can go back to; an unknown version stops with exit code 1.

## Where

- `scripts/rollback.mjs` (new): `releases/<name>-<version>.zpkg.zip` → `npx znode install <zip>`
- `package.json`: `"rollback": "node scripts/rollback.mjs"`

## Limits

- The store's plugin folder keeps only the installed version's code (009), so the older zip must exist:
  `npm run pack` / `deploy` leave one per version in `releases/`, which is git-ignored and so only on the machine that
  built it. A shared place for release zips (GitHub releases, a build server) is what makes this work for a team.
- It is per package, not a platform rollback of the whole plugin folder (that is `.history/` plus the files).

## How to check

`output.txt` / `evidence.png`: the list of packed versions, a rollback to 1.0.0 (settings kept), forward again to
1.0.1, and an unknown version refused. There are no page screenshots: 1.0.0 and 1.0.1 look the same.
