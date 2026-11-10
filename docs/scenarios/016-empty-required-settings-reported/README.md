# 016: Are required settings that are still empty reported at install?

**Listed:** Yes. **Result here:** Yes, confirmed.

## What

With `supportPhone` declared `"required": true` (015) and no value in the store's registry, the install says so:

```
installed theme spp-customization@1.0.1 (was 1.0.1): 8 files, disabled for []
  settings to fill in before enabling: supportPhone
```

After the value is set (`node scripts/registry.mjs set supportPhone=1-800-555-0199`), the next deploy has nothing to
report. The install keeps the store's values across upgrades and fills new settings from their defaults; a required
setting has no default, so it is listed until someone fills it in.

## Where

No code change (the setting is from 015). Rule: `node_modules/znode-plugin/lib/znode-package.mjs`
(`settings to fill in before enabling`).

## How to check

`output.txt` / `evidence.png`: `npm run check`, the deploy with the setting empty (reported), the value set, and the
deploy again (not reported).
