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
| `npm run uninstall [-- --package <name>] [--purge]` | Remove a package of this repo from the store cleanly: its registry entry and records, its files, older versions' leftovers; `--purge` also the kept versions (`scripts/uninstall.mjs`) |
| `npm run link-store -- <store repo>` | Use the store's real types (writes `tsconfig.store.json`) |
| `npm run shot -- --path / --out <file.png>` | Screenshot a store page with this theme previewed (`scripts/shot.mjs`; `--theme none` for the store's own) |
| `npm run inventory [-- <manifest>]` | What the built package carries: slots, widgets, routes, hooks, settings, assets (`scripts/inventory.mjs`) |
| `npm run overrides [-- <store> ...] [--probe <host>]` | Which store API routes are taken over, on which store, by which plugin; with `--probe`, whether a browser can reach an overridden store route by spelling its path another way (`scripts/overrides.mjs`) |
| `npm run a11y -- --path / [--theme none] [--store <url>]` | Accessibility check of this repo's parts on a page: axe (WCAG 2.1 A/AA) and the keyboard (`scripts/a11y.mjs`) |
| `npm run page-files -- --path / [--store <url>] [--theme <name>] [--again]` | Which package files a page loads, by package, with size and cache headers (`scripts/page-files.mjs`) |
| `npm run vitals -- --path / [--theme <name>] [--runs 3] [--throttle] [--film out.png]` | Core Web Vitals of a page (FCP, LCP, CLS with what moved, TBT), median of several loads, optionally on a throttled phone, with a filmstrip (`scripts/vitals.mjs`) |
| `npm run registry -- store <code>` / `install <stores> [key=value ...]` / `remove <stores>` `[--package <name>]` | What a store gets (theme chain, plugins, its setting overrides); place a package on stores with their own settings (`installations`), or take it off (`scripts/registry.mjs`; also `show`, `set`, `enable`, `sandbox`, `stores`, `themes`, `before`) |
| `npm run secrets-check` | Checks the secret-setting resolver (`env:NAME` references, `src/commerce/secrets.ts`) |
| `npm run quotes-check` | Checks that a signed-in buyer sees only their own quote requests (`quotesFor`, `src/commerce/quotes.ts`) |
| `npm run probe-files [-- --host <store host>]` | What the store's package-files route refuses: server bundles (every version on disk, other spellings), the registry and its copies, `../` in every encoding; an SVG's headers (`scripts/probe-files.mjs`) |
| `npm run svg-check [-- --file <svg> --store <url>]` | Whether script inside a package's SVG runs in the browser: opened directly, in iframe/object/embed/img, inlined with innerHTML, plus a no-CSP control (`scripts/svg-check.mjs`) |

## Use-case scenarios

[`SCENARIOS.md`](SCENARIOS.md) tracks every use case: how this repo proves it and its progress. Each scenario is one
commit, with `docs/scenarios/<nnn>-<slug>/` holding its notes and before/after screenshots.

[`docs/RENDER-FLOW.md`](docs/RENDER-FLOW.md) traces how a page renders end to end, in two separate parts: the
webstore's own path (Znode API → agent → BFF / page → base component) and where each package of this repo joins it
(registry → manifest → slots, widgets, styles, labels, server slots, routes, hooks), with the product card worked
through in full and every scenario mapped to its commit. Each scenario's README has a "How it renders" section
(`node scripts/render-flow-sections.mjs` adds it).

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
