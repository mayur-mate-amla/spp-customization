# 015: Can a package declare required settings?

**Listed:** Yes. **Result here:** Yes, confirmed.

| Before | Required setting still empty | After (value set) |
| --- | --- | --- |
| ![before](before.png) | ![empty](empty.png) | ![after](after.png) |

## What changed

A new **required** setting, `supportPhone` (the customer service phone). When it has a value, the announcement bar
shows a **Call 1-800-555-0199** link (`tel:`). While it is empty the bar just leaves it out, so the page never breaks.

The install reports a required setting that is still empty (016). The store itself does not enforce `required`; it is
for the install report and for whoever configures the package (an admin screen does not exist yet, row 19).

## Where

- `znode-package.json` → `settingsSchema.supportPhone`: `"type": "string"`, `"required": true`, `"browser": true`,
  no default (a required setting with a default gets a `znode check` warning)
- `src/slots/AnnouncementBar.tsx`: reads `settings.supportPhone`, renders the `tel:` link
  (`data-test-selector="linkSupportPhone"`)
- `scripts/registry.mjs` (new): changes this package's entry in the store's `plugins.json` with the same lock and
  `.history/` copy as `znode install`; used here to set the value

## How

```bash
npm run check      # 0 errors, 0 warnings
npm run deploy     # ... settings to fill in before enabling: supportPhone
node scripts/registry.mjs set supportPhone=1-800-555-0199
```
