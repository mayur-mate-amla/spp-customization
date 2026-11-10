# Spp Customization

A Znode runtime theme, made with `create-znode-plugin`. It is built and deployed on its own and runs in the webstore
for the stores it is enabled for: no fork of the store, no webstore rebuild.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Build and deploy now, then again on every save; refresh the store page to see it |
| `npm run build` | Type-check against the store, then build into `dist/` |
| `npm run check` | The marketplace review: metadata, permissions against the code, sizes |
| `npm run pack` | Build and zip into `releases/spp-customization-<version>.zpkg.zip` |
| `npm run deploy` | Pack and install into the store's plugin folder |
| `npm run link-store -- <store repo>` | Use the store's real types (writes `tsconfig.store.json`) |
| `npm run shot -- --path / --out <file.png>` | Screenshot a store page with this theme previewed (`scripts/shot.mjs`; `--theme none` for the store's own) |

## Use-case scenarios

[`SCENARIOS.md`](SCENARIOS.md) tracks every use case: how this repo proves it and its progress. Each scenario is one
commit, with `docs/scenarios/<nnn>-<slug>/` holding its notes and before/after screenshots.

The store's plugin folder (its `RUNTIME_PLUGINS_DIR`) comes from `znode.local.json` (`{ "pluginsDir": "…" }`,
git-ignored), or the `RUNTIME_PLUGINS_DIR` environment variable. After the first deploy, enable the theme for your
stores in that folder's `plugins.json` (`"enabled": true`, `"stores": ["<store code>"]`).

## Where each customization goes

| You want to | Do it in | Example here |
| --- | --- | --- |
| Change colors, fonts, spacing | `src/styles/*.css`, settings, `next/font/google` | `theme.css`, `src/server/fonts.ts` |
| Wrap every page in your layout | Server slot `layout.root` in `src/server.tsx` | `src/server/ThemeLayout.tsx` |
| Add to or replace a store part | A slot in `src/browser.tsx` (names in `znode-plugin/types/extension-api.d.ts`) | `src/slots/AnnouncementBar.tsx`, `src/slots/ProductBadge.tsx` |
| Add a page-builder block | A widget in `src/browser.tsx` and `"widgets"` in `znode-package.json` | `src/widgets/Hero.tsx` |
| Add a page at a new URL | `serverPages` in `src/server.tsx` and `"serverPages"` in `znode-package.json` | `/spp-customization-welcome`, `src/server/WelcomePage.tsx` |
| Add your own API | `routes` in `src/server.tsx` | `GET /api/extensions/plugins/spp-customization/highlights` |
| Let the merchant configure it | `settingsSchema` in `znode-package.json` | `accentColor`, `announcement`, `showBadge` |
| Change labels | `src/i18n/labels.json` (next-intl namespaces) | `{ "Product": { "addToCart": "Add to bag" } }` |
| Use the store's components | `import { SearchBox } from "@znode/base-components/…"` in browser parts | needs `npm run link-store` for types |

Imports work as in a Next.js app: `next/image`, `next/link`, `next/navigation`, `next/font/google`, `react`. They use
the store's own copies at runtime (one React, the store's router and images config).
