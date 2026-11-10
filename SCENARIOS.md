# Use-case scenarios: progress

Every row of the use-case list, and how this repository (the `spp-customization` runtime theme) proves it. Each
scenario that can be shown from here gets **its own commit**, made on top of the previous one, with a folder
`docs/scenarios/<nnn>-<slug>/` holding:

- `README.md`: what changed, where (files) and how, and how to check it
- `before.png` / `after.png`: the store page before and after the change (taken with `scripts/shot.mjs`)
- for a **Check** row, which changes nothing on a page: `output.txt` (the commands and what they printed) and
  `evidence.png` (the same, as an image), plus before/after where a request or page shows the difference
- a **How it renders** section: where the scenario lands in the webstore's own rendering (Znode API → agent → page /
  BFF route → base component) and where this repo's package joins it, linked to
  [`docs/RENDER-FLOW.md`](docs/RENDER-FLOW.md), which traces both end to end and lists every scenario with its commit(s)

Commit message format: `scenario <nnn>: <use case>`, then what changed, where and how.

## Legend

**Progress**

| Mark | Meaning |
| --- | --- |
| ✅ Done | Committed and pushed; the commit is linked |
| 🟡 In progress | Being worked on now |
| ⬜ Not started | Can be shown from this repo, not done yet |
| ⛔ Blocked | The list says **No**: needs a webstore or platform change (no base edits are made from here) |
| ➖ Outside | Not something a theme repo can show: production, scale, the store repo, or other packages |

**How**

| Approach | What it means |
| --- | --- |
| UI | A change in this theme's code; before/after screenshots of the store page |
| Config | A change in the store's plugin folder (`D:\runtime-plugins-store\plugins.json`), recorded in the scenario folder; before/after screenshots |
| Check | Proven by a command or a request; the output is saved in the scenario folder (a screenshot where there is something to see) |
| Base | Needs the webstore itself to change |
| Outside | See ➖ above |

**Setup.** Webstore in development mode at `http://localhost:3000` (the Acme Manufacturing store, Apex theme).
Screenshots use the theme preview (`/api/extensions/preview?theme=spp-customization`), which shows this theme in place
of the store's own without changing `plugins.json`. "Before" is the theme as it was at the previous commit.

**Open question: where to show product scenarios.** In this environment the Acme store (`localhost:3000`) and the
Kalles store (`kalles.localhost:3000`) have no products: every category says "No records found" and search finds
nothing. Listing, product page, product card, add-to-cart, cart and checkout rows (29, 50, 51, 54, 55, 57, 80-82,
106, 109, 112-117, 120 and others) need a store with products: the SPP stores (`sppdemo.localhost:3000`,
`staplespromo.localhost:3000`, `nvidia.localhost:3000`, `lol.localhost:3000`) have them. This repository is
**public**, so their screenshots would publish client storefronts; waiting for a decision (make the repo private, or
approve those screenshots) before those rows.

**Other findings so far:** asset files are not protected from other packages (007); `znode create` exists (022);
one-command rollback, kept versions and clean uninstall are implemented in this repo (009, 010, 011).

**Notes where the list may be out of date** (re-checked against the SDK and store code in this repo):

- 22: `znode create <kind> <name>` scaffolds a package (SDK README), so this looks like **Yes**.
- 40 / 98 / 99: the SDK accepts `"overrides"` on any package kind, a theme included; to confirm when we get there.
- 53: a `layout.head` browser slot exists (`<title>`, `<meta>`, `<link>`, `<script async>`), so **Partial** rather than No.
- 165: a package can set `"sandbox": true` (server part in a separate, permission-limited process).
- 166: plugin routes are limited to 120 calls a minute per shopper address (extension API docs).
- 183: the build writes source maps (`dist/*.mjs.map`) and they are installed with the package.

## Summary

| Progress | Rows |
| --- | --- |
| ✅ Done | 65 |
| 🟡 In progress | 0 |
| ⬜ Not started | 71 |
| ⛔ Blocked | 39 |
| ➖ Outside | 42 |
| **Total** | **217** |

## Packages

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Can a partner build a theme, plugin or widget outside our repo? | Yes | Check | This repo: built and deployed with no store-repo checkout edits | ✅ Done | [notes](docs/scenarios/001-partner-builds-outside-store-repo/) |
| 2 | Is there one package format (znode-package.json)? | Yes | Check | `znode-package.json` with `kind`; `znode check` passes | ✅ Done | [notes](docs/scenarios/002-one-package-format/) |
| 3 | Is there an SDK to build, pack and install a package? | Yes | Check | `npm run build`, `pack`, `deploy` output | ✅ Done | [notes](docs/scenarios/003-sdk-build-pack-install/) |
| 4 | Is the public API documented for partners (extension-api.d.ts)? | Yes | Check | Build type-checks `src/` against `extension-api.d.ts` | ✅ Done | [notes](docs/scenarios/004-public-api-documented/) |
| 5 | Are partner docs and examples available? | Yes | Check | SDK README and this repo's README / examples | ✅ Done | [notes](docs/scenarios/005-partner-docs-and-examples/) |
| 6 | Is a package validated at install? | Yes | Check | Bad version / name / file in a copy of the manifest: install refuses it | ✅ Done | [notes](docs/scenarios/006-package-validated-at-install/) |
| 7 | Is a package prevented from overwriting another package's files? | Yes | Check | Not fully: code/styles/labels/pages protected; **assets can be overwritten**. Needs znode-plugin SDK change (see notes) | ⛔ Blocked | [notes](docs/scenarios/007-no-overwriting-other-packages/) |
| 8 | Can I install or update a package without a build or restart? | Yes | UI | Change the announcement text, `npm run deploy`, refresh: new text, no store restart | ✅ Done | [notes](docs/scenarios/008-install-update-without-restart/) |
| 9 | Are older package versions kept on disk for rollback? | Yes | Check | Result: **Yes**. `npm run deploy` keeps each version in `<plugin folder>/.versions/`; `npm run rollback` reinstalls one | ✅ Done | [notes](docs/scenarios/009-older-versions-kept/) |
| 10 | Is there a one-command rollback? | No | Base | Result: **Yes** for this package: `npm run rollback -- <version>` (needs the older zip in releases/) | ✅ Done | [notes](docs/scenarios/010-rollback-with-one-command/) |
| 11 | Can a package be uninstalled cleanly (files removed)? | Partial | Check | Result: **Yes**. `npm run uninstall` removes the entry and every owned file (`--purge`: kept versions too) | ✅ Done | [notes](docs/scenarios/011-uninstall-package/) |
| 12 | Can a package be switched on or off without uninstalling it? | Yes | Config | Example: kill switch, store falls back to redpanda while the theme stays installed | ✅ Done | [notes](docs/scenarios/012-switch-package-on-off/) |
| 13 | Can a package be installed for some stores only? | Yes | Config | Example: pilot on POCSppDemo; StaplesPromo, NVIDIA, Land O'Lakes unaffected | ✅ Done | [notes](docs/scenarios/013-some-stores-only/) |
| 14 | Can the same package be installed twice with different settings? | No | Base | | ⛔ Blocked | |
| 15 | Can a package declare required settings? | Yes | UI | `settingsSchema` field with `"required": true` | ✅ Done | [notes](docs/scenarios/015-required-settings/) |
| 16 | Are required settings that are still empty reported at install? | Yes | Check | Deploy output names the empty required setting | ✅ Done | [notes](docs/scenarios/016-empty-required-settings-reported/) |
| 17 | Can a package declare which API version it needs? | Yes | Check | `"apiVersion": 1`; a wrong value is refused | ✅ Done | [notes](docs/scenarios/017-api-version-declared/) |
| 18 | Can a package declare that it depends on another package? | No | Base | (`parent` covers theme-on-theme only) | ⛔ Blocked | |
| 19 | Is there an admin screen to upload, enable and configure packages? | No | Base | | ⛔ Blocked | |
| 20 | Is there a package marketplace or catalogue? | No | Base | | ⛔ Blocked | |
| 21 | Are packages signed and verified at install? | No | Base | | ⛔ Blocked | |
| 22 | Is there a command to scaffold a new package? | No | Check | Result: **Yes**: `npx znode create <kind> <name>` and `npm create znode-plugin` | ✅ Done | [notes](docs/scenarios/022-scaffold-command/) |

## Themes

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 23 | Can I create a complex theme? | Yes | UI | Done when 24-41 are: the sum of them | ⬜ Not started | |
| 24 | Can I create a theme with CSS only (tokens, fonts, colors)? | Yes | UI | Design tokens in `src/styles/tokens.css` (store CSS variables) | ✅ Done | [notes](docs/scenarios/024-css-only-tokens/) |
| 25 | Can a theme carry UI code (header, footer, cards, layouts)? | Yes | UI | Covered by 48-50 and 52-55 (header, footer, card, layouts) | ⬜ Not started | |
| 26 | Can a child theme inherit from a parent theme? | Yes | UI | Example: campaign home page from spp-base's HeroBanner, PromoCodeStrip, CardGrid, DeliveryDates | ✅ Done | [notes](docs/scenarios/026-child-theme-inherits-parent/) |
| 27 | Can themes inherit more than one level deep? | Yes | UI | Example: sub-brand of Red Panda (Montserrat) on spp-base (widgets), own colors on top | ✅ Done | [notes](docs/scenarios/027-multi-level-inheritance/) |
| 28 | Can I use my own font files in a theme? | Yes | UI | Example: self-hosted brand font (Geist, OFL) for headings | ✅ Done | [notes](docs/scenarios/028-own-font-files/) |
| 29 | Can I update the CSS? | Yes | UI | Example: listing card refresh (hover lift, price, stock pill), CSS only, on POCSppDemo | ✅ Done | [notes](docs/scenarios/029-update-css/) |
| 30 | Can I change fonts and colors per theme? | Yes | UI | Example: accentColor and headingFont settings (store attributes) drive the brand; no code change | ✅ Done | [notes](docs/scenarios/030-fonts-and-colors-per-theme/) |
| 31 | Is a theme's CSS kept from clashing with the store's own CSS? | Yes | Check | Example: trust strip with copied live-site CSS; dedupeStyles drops the 8 rules the store has | ✅ Done | [notes](docs/scenarios/031-css-does-not-clash/) |
| 32 | Can I change labels and messages per theme? | Yes | UI | Example: B2B wording (Item #, Availability, Ready to ship, Add to order) | ✅ Done | [notes](docs/scenarios/032-labels-per-theme/) |
| 33 | Can I change logos and images per store? | Yes | UI | Example: co-branded header logo from setting logoUrl (store attribute ThemeLogoUrl) | ✅ Done | [notes](docs/scenarios/033-logo-per-store/) |
| 34 | Can I assign a theme per store? | Yes | Config | Example: POCSppDemo moved from redpanda to spp-customization (plugins.json only) | ✅ Done | [notes](docs/scenarios/034-assign-theme-per-store/) |
| 35 | Can I switch a store's theme without a deploy? | Yes | Config | Example: POCSppDemo back to redpanda; picked up in 226 ms, no deploy | ✅ Done | [notes](docs/scenarios/035-switch-theme-without-deploy/) |
| 36 | Can I preview a theme before it goes live? | Yes | Check | Example: review link + 'Previewing theme … Exit preview' bar | ✅ Done | [notes](docs/scenarios/036-preview-before-live/) |
| 37 | Does the theme show in the page-builder preview? | Yes | Check | Example: editor canvas shows the theme; page builder needs RUNTIME_PLUGINS_DIR; CSS defaults on tokens | ✅ Done | [notes](docs/scenarios/037-page-builder-preview/) |
| 38 | Can a theme include page-builder widgets? | Yes | UI | Example: Customer testimonials widget (editor category Spp Customization), on the home page | ✅ Done | [notes](docs/scenarios/038-theme-includes-widgets/) |
| 39 | Can I add routes in a theme? | Partial | UI | Result: **Yes**. Example: shipping-cutoff route (Order within 3h 12m to ship today) in the trust strip | ✅ Done | [notes](docs/scenarios/039-routes-in-theme/) |
| 40 | Can a theme take over a store API route? | No | Base | Re-check: SDK accepts `overrides` on a theme (see notes) | ⛔ Blocked | [notes](Confirmed No: the store skips themes for overrides (route-overrides.server.ts, findRouteOverride: entry.kind === theme). Workaround: a companion plugin package (98, 99)/) |
| 41 | Does the mobile layout work? | Partial | UI | Result: **Yes** for the theme's parts. Example: one-line bars and a swipeable trust strip on phones | ✅ Done | [notes](docs/scenarios/041-mobile-layout/) |

## Components

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | Can I update a component? | Yes | UI | Example: popular searches added to the store's search box (header.search) | ✅ Done | [notes](docs/scenarios/042-update-component/) |
| 43 | Can I override an existing component with a runtime package? | Partial | UI | Example: Customize & order replaces add-to-cart for decorated SKUs. Works for every wrapped component (product.card, product.image too; artifi overrides product.image after the theme) | ✅ Done | [notes](docs/scenarios/043-override-component/) |
| 44 | Can I override an existing component with an SWC build-time theme? | Yes | Outside | Build-time themes live in the store repo | ➖ Outside | |
| 45 | Can I add a new slot (extension point) from a package? | No | Base | | ⛔ Blocked | |
| 46 | Can two plugins change the same slot? | Yes | Check | Example: companion plugin spp-commerce adds a B2B account bar to the theme's layout.header | ✅ Done | [notes](docs/scenarios/046-two-packages-same-slot/) |
| 47 | Can I control the order in which plugins fill a slot? | Partial | Check | Result: **Yes** between plugins (plugins.json order); theme chain always first. Example: account bar vs sale countdown bar | ✅ Done | [notes](docs/scenarios/047-order-of-packages-in-slot/) |
| 48 | Can I change the header? | Yes | UI | Example: compact sticky header once the shopper scrolls (desktop) | ✅ Done | [notes](docs/scenarios/048-change-header/) |
| 49 | Can I change the footer? | Yes | UI | Example: Need-help band (phone, email, hours, payments); fixed the footer slot landing in the hidden header | ✅ Done | [notes](docs/scenarios/049-change-footer/) |
| 50 | Can I change the product card? | Yes | UI | Example: B2B promo card via productList.layout (product.card also runs here); fallback to the store's listing fixed | ✅ Done | [notes](docs/scenarios/050-change-product-card/) |
| 51 | Can I change the added-to-cart popup? | Yes | UI | Example: Added to your order popup (View order / Keep shopping) from the cart count | ✅ Done | [notes](docs/scenarios/051-added-to-cart-popup/) |

## Layout

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 52 | Can I change the layout code? | Partial | UI | Result: **Yes** (header to footer). Example: skip link + server-rendered dated holiday notice (layout.root) | ✅ Done | [notes](docs/scenarios/052-change-layout-code/) |
| 53 | Can I change the root layout (html/head, global scripts)? | No | Base | Result: **Yes** for head tags and global scripts (layout.head). Example: theme-color, favicon, preconnect, analytics dataLayer | ✅ Done | [notes](docs/scenarios/053-root-layout-head/) |
| 54 | Can I change the listing layout? | Yes | UI | Example: quick price / ready-to-ship filters above the grid (productList.layout) | ✅ Done | [notes](docs/scenarios/054-change-listing-layout/) |
| 55 | Can I change the product page layout? | Yes | UI | Example: sticky B2B buy box + Key details / volume pricing panel (CSS + product.addToCart; keeps every store piece) | ✅ Done | [notes](docs/scenarios/055-change-product-page-layout/) |
| 56 | Can I change the cart page layout? | No | Base | Result: **Yes** for layout and look (CSS on the cart's hooks); no cart slot for components. Example: sticky summary card, item cards | ✅ Done | [notes](docs/scenarios/056-cart-page-layout/) |
| 57 | Can I change the checkout layout? | Partial | UI | Example: numbered checkout step cards + sticky order summary (CSS on checkout hooks) | ✅ Done | [notes](docs/scenarios/057-checkout-layout/) |
| 58 | Can I change the account section layout? | No | Base | | ⛔ Blocked | |

## Widgets

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 59 | Can I add a new widget? | Yes | UI | Example: FAQ accordion widget (details/summary), in the editor's Spp Customization category | ✅ Done | [notes](docs/scenarios/059-add-new-widget/) |
| 60 | Can I create a widget in a theme and use it for that theme or globally? | Yes | UI | Example: theme widgets on theme stores; spp-widgets package (Visit our showroom) on every store | ✅ Done | [notes](docs/scenarios/060-theme-or-global-widget/) |
| 61 | Can a plugin carry a widget? | Yes | Check | Example: spp-commerce plugin's Your account manager widget, dropped on a redpanda store's page | ✅ Done | [notes](docs/scenarios/061-plugin-carries-widget/) |
| 62 | Can I give a widget settings fields in the page builder? | Yes | UI | Example: Promotion banner with headline, details, discount, style, alignment fields | ✅ Done | [notes](docs/scenarios/062-widget-settings-fields/) |
| 63 | Are text, textarea, number, select, radio, list, object and custom fields supported? | Yes | UI | Example: Promotion banner with text, textarea, number, select, radio, list, object and custom (brand swatches) | ✅ Done | [notes](docs/scenarios/063-all-field-types/) |
| 64 | Can a widget have default values? | Yes | UI | Example: season-aware defaults for new Promotion banners | ✅ Done | [notes](docs/scenarios/064-widget-default-values/) |
| 65 | Can a widget appear in its own editor category? | Yes | UI | Example: SPP · Content and SPP · Promotions categories | ✅ Done | [notes](docs/scenarios/065-widget-editor-category/) |
| 66 | Does the editor preview a widget live while editing? | Yes | Check | Example: headline typed in the panel shows on the canvas as it is typed | ✅ Done | [notes](docs/scenarios/066-live-preview-while-editing/) |
| 67 | Can I drag a new package widget onto a page and publish it? | Not tested | Check | Result: **Yes, published locally**: editor Publish with writes blocked, page saved as a package page, CMS untouched | ✅ Done | [notes](docs/scenarios/067-drag-and-publish-widget/) |
| 68 | Can I update an existing widget's config (fields, defaults)? | Partial | UI | Result: **Yes** (the package must render the type). Example: Promo code strip + Expires on (auto-hide) and Terms fields | ✅ Done | [notes](docs/scenarios/068-update-existing-widget-config/) |
| 69 | Can I change an existing widget's design? | Yes | UI | Example: parent's Card grid fixed and restyled into a 4-column department grid (CSS only) | ✅ Done | [notes](docs/scenarios/069-change-existing-widget-design/) |
| 70 | Can I replace how an existing widget renders? | Yes | UI | Example: parent's Delivery dates rendered as a holiday shipping timeline (next cutoff, past struck) | ✅ Done | [notes](docs/scenarios/070-replace-widget-render/) |
| 71 | Can I hide or remove a base widget from the page builder for a theme? | No | Base | Result: **Yes, hide from the list** (theme CSS in the editor); removing a type still needs a page-builder change. Example: curated list for SPP stores | ✅ Done | [notes](docs/scenarios/071-hide-base-widget/) |
| 72 | Can I reorder the editor's widget categories? | No | Base | Result: **Yes, visual order** (theme CSS in the editor). Example: SPP · Promotions and SPP · Content first | ✅ Done | [notes](docs/scenarios/072-reorder-editor-categories/) |
| 73 | Can a widget hold other widgets (nested)? | Partial | Check | Try a slot field in a package widget | ⛔ Blocked | [notes](Confirmed No: nesting needs Puck's drop zones, but the store's widget preview removes the puck prop before calling a package widget (RuntimePageEditor.tsx preview())/) |
| 74 | Can a widget load its data on the server like base widgets? | Partial | Check | Widget calling this theme's route | ⬜ Not started | |
| 75 | Are package widgets in the server HTML (for SEO)? | No | Base | | ⛔ Blocked | [notes](Confirmed No: package widgets render in the browser (RuntimeWidget, client); the server HTML has only their wrapper (checked in 068)/) |
| 76 | Can widget settings differ per locale? | No | Base | | ⛔ Blocked | |
| 77 | Can a widget be used on one store only? | Yes | Config | Example: Visit our showroom (spp-widgets) placed for POCSppDemo only | ✅ Done | [notes](docs/scenarios/077-widget-one-store-only/) |
| 78 | Can package widgets be used in header and footer pages? | Partial | Check | Needs the page-builder app running | ⬜ Not started | |

## Plugins

A theme package takes the same server hooks, routes and permissions as a plugin (`"permissions"`), so these are
shown in this package. A separate `kind: plugin` package can be added to this repo if you prefer them apart.

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 79 | Can I create a complex plugin? | Yes | UI | Done when 80-91 are: the sum of them | ⬜ Not started | |
| 80 | Can a plugin run code before and after add to cart? | Yes | UI | Example: beforeAddToCart rounds to case packs (1 lanyard -> 10); afterAddToCart activity log | ✅ Done | [notes](docs/scenarios/080-before-after-add-to-cart/) |
| 81 | Can a plugin react when the cart changes? | Yes | UI | onCartChanged: per-order limit (817NK_25 max 5), line removed and re-added at the limit | ✅ Done | [notes](081-on-cart-changed/) |
| 82 | Can a plugin change cart lines before they are shown? | Yes | UI | mapCartItems: case-pack and order-limit notes under the cart lines | ✅ Done | [notes](082-map-cart-items/) |
| 83 | Can a plugin fill slots in the page? | Yes | UI | Covered by 48-51 | ⬜ Not started | |
| 84 | Can a plugin transform data (listing data, popup data)? | Yes | UI | `productList.data` transform | ⬜ Not started | |
| 85 | Can a plugin read the shopper's cart and user? | Yes | UI | Route using `context.user` / `cartNumber`, shown in a slot | ⬜ Not started | |
| 86 | Can a plugin set cookies? | Partial | Check | Route answering with `Set-Cookie` | ⬜ Not started | |
| 87 | Can a plugin store its own data (database)? | No | Base | | ⛔ Blocked | |
| 88 | Can a plugin add labels and messages? | Yes | UI | New namespace in `labels.json` | ⬜ Not started | |
| 89 | Can a plugin add a page with its own URL? | Partial | UI | `serverPages` (`/spp-customization-welcome` and a new one) | ⬜ Not started | |
| 90 | Can plugins send events to each other? | No | Base | | ⛔ Blocked | |
| 91 | Can a plugin receive webhooks or callbacks? | Yes | Check | Route with `verifySignature`, called with curl | ⬜ Not started | |
| 92 | Can a plugin run scheduled jobs? | No | Base | | ⛔ Blocked | |

## BFF / API

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 93 | Can I add a new BFF layer or call any new API? | Yes | Check | Route calling an API, called from the browser part | ⬜ Not started | |
| 94 | Can I create a new BFF API? | Yes | Check | New route `GET /api/extensions/plugins/spp-customization/<route>` | ⬜ Not started | |
| 95 | Can a plugin call the Znode API with the store's headers? | Yes | Check | Route using `context.znode(...)` (`znodeApi` permission) | ⬜ Not started | |
| 96 | Can a plugin call an external API from the server? | Yes | Check | Route calling a public API (`externalNetwork` permission) | ⬜ Not started | |
| 97 | Can a plugin call an external API from the browser? | No | Base | | ⛔ Blocked | |
| 98 | Can I wrap an existing store API route (change its input or output)? | Yes | Check | `"overrides"` with `context.original()` | ⬜ Not started | |
| 99 | Can I replace an existing store API route completely? | Yes | Check | `"overrides"` without calling the original | ⬜ Not started | |
| 100 | Is a route override applied only for the stores the plugin is enabled for? | Yes | Check | Same request on a store without the theme | ⬜ Not started | |
| 101 | Are request bodies to plugin routes size-limited? | Yes | Check | POST over 64 KB: refused | ⬜ Not started | |

## Agents

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 102 | Can I extend or update existing agent logic? | Partial | Check | Through hooks and overrides (80-82, 98) | ⬜ Not started | |
| 103 | Can I update an agent with a runtime package? | Partial | Check | Same as 102 | ⬜ Not started | |
| 104 | Can I update an agent with an SWC build-time theme? | Yes | Outside | Store repo | ➖ Outside | |
| 105 | Can I change agents called during server rendering? | No | Base | | ⛔ Blocked | |
| 106 | Can I change add-to-cart logic? | Yes | UI | `beforeAddToCart` changes the request (quantity rule) | ⬜ Not started | |
| 107 | Can I change place-order logic? | Partial | Check | Override of `/api/place-order` | ⬜ Not started | |
| 108 | Can I change pricing, tax or promotion calculation? | No | Base | | ⛔ Blocked | |
| 109 | Can I change inventory checks? | Partial | Check | `beforeAddToCart` refusing over a stock limit | ⬜ Not started | |

## Middleware

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 110 | Can I update the middleware (proxy) code if required? | No | Base | | ⛔ Blocked | |
| 111 | Can a package add redirects, headers or auth rules per store? | No | Base | | ⛔ Blocked | |

## Cart

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 112 | Can I change the cart page? | Partial | UI | `mapCartItems` (line text) and CSS | ⬜ Not started | |
| 113 | Can a plugin add or remove cart items automatically? | Yes | UI | onCartChanged: ID holder brings its lanyard, removed with it (a free item needs a Znode promotion) | ✅ Done | [notes](113-auto-add-remove/) |
| 114 | Can a plugin enforce cart rules (minimums, bundles)? | Yes | UI | `onCartChanged` minimum quantity rule | ⬜ Not started | |

## Checkout

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 115 | Can I change the checkout? | Partial | UI | Covered by 116-117 | ⬜ Not started | |
| 116 | Can I change the checkout address step? | Yes | UI | `checkout.address` slot | ⬜ Not started | |
| 117 | Can I filter or change shipping methods? | Yes | UI | `checkout.shippingOptions` slot | ⬜ Not started | |
| 118 | Can I change the payment step UI? | No | Base | | ⛔ Blocked | |
| 119 | Can I change the payment gateway? | No | Base | | ⛔ Blocked | |
| 120 | Can I add custom data to the order? | Yes | Check | Override of place-order adding custom data | ⬜ Not started | |
| 121 | Can I add a complete new module (e.g. quick checkout) without touching base? | Partial | UI | Server page + routes (quick-order page) | ⬜ Not started | |
| 122 | Does guest checkout work on the test environment? | No | Outside | Test environment, not this repo | ➖ Outside | |

## Orders

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 123 | Can I change the order confirmation page? | No | Base | | ⛔ Blocked | |
| 124 | Can I change emails, order receipts or invoices? | No | Base | | ⛔ Blocked | |
| 125 | Can I change returns, quotes or pending orders? | No | Base | | ⛔ Blocked | |

## Account

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 126 | Can I check or create a new page in the account section? | No | Base | | ⛔ Blocked | |
| 127 | Can I change the dashboard design in the account section? | Partial | UI | CSS on the account dashboard | ⬜ Not started | |
| 128 | Can I change the design or add a page in the account section? | Partial / No | UI | Design: CSS (as 127); new page: blocked | ⬜ Not started | |
| 129 | Can I add items to the account menu? | No | Base | | ⛔ Blocked | |

## Auth

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 130 | Can I change the login and registration pages? | Partial | UI | `login.layout` / `login.page` server slots | ⬜ Not started | |
| 131 | Can I add a custom login provider (SSO)? | No | Base | | ⛔ Blocked | |
| 132 | Can I change password rules? | No | Base | | ⛔ Blocked | |

## SEO

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 133 | Can I change SEO and meta tags per theme? | No | Base | Re-check with `layout.head` (see notes) | ⛔ Blocked | |
| 134 | Can I add structured data (JSON-LD) per store? | No | Base | | ⛔ Blocked | |
| 135 | Can I change the sitemap or robots rules? | No | Base | | ⛔ Blocked | |
| 136 | Is the webstore AEO and GEO compatible? | Not tested | Outside | Webstore-wide audit | ➖ Outside | |

## Accessibility

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 137 | Does the webstore reach a AAA accessibility rating? | Not tested | Outside | Webstore-wide audit | ➖ Outside | |
| 138 | Do package widgets work with the keyboard and screen readers? | Partial | UI | Labels, focus styles and roles in this theme's widgets | ⬜ Not started | |

## Languages

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 139 | Can labels be translated per language? | Yes | UI | Labels per locale in `labels.json` | ⬜ Not started | |
| 140 | Do right-to-left languages work? | Not tested | Check | `dir="rtl"` on this theme's parts, screenshot | ⬜ Not started | |

## Performance

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 141 | Can I avoid performance degradation if I create more themes? | Yes | Outside | Platform measurement | ➖ Outside | |
| 142 | Was performance checked with 5 heavy themes? | Yes | Outside | Platform measurement | ➖ Outside | |
| 143 | Does only the active theme load on a page? | Yes | Check | Page's package files: only this theme's | ⬜ Not started | |
| 144 | Is the package registry cached between requests? | Yes | Outside | Store code | ➖ Outside | |
| 145 | Are package files cached in the browser until they change? | Yes | Check | `?v=` on file URLs and cache headers | ⬜ Not started | |
| 146 | Does the SPP listing card avoid one request per card? | No | Outside | spp-base package, not this repo | ➖ Outside | |
| 147 | Has a Lighthouse or Core Web Vitals score been measured? | Not tested | Check | Lighthouse run on a page with this theme | ⬜ Not started | |
| 148 | Is layout shift from late-loading package UI measured? | Not tested | Check | CLS from the same Lighthouse run | ⬜ Not started | |

## Scale

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 149 | Can my code handle 10 themes? | Yes | Outside | Platform | ➖ Outside | |
| 150 | Can my code handle 100 plugins? | Not tested | Outside | Platform load test | ➖ Outside | |
| 151 | Can my code handle 100 widgets? | Not tested | Outside | Platform load test | ➖ Outside | |
| 152 | Can my code handle 100 stores? | Not tested | Outside | Platform load test | ➖ Outside | |

## Multi-store

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 153 | Can I serve 10 stores with different theme, style, functionality and business logic? | Yes, with one limit | Outside | Platform | ➖ Outside | |
| 154 | Can each store have different plugins? | Yes | Config | Shown with 13 | ⬜ Not started | |
| 155 | Can each store have different page content? | Yes | Outside | Content packages per store | ➖ Outside | |
| 156 | Can settings differ per store? | Partial | Config | `installations` with per-store settings | ⬜ Not started | |
| 157 | Can several stores share one theme? | Yes | Config | Two store codes in `"stores"` | ⬜ Not started | |
| 158 | Are the 3 new stores (KLRT, Lands And Cotes, GE) started? | No | Outside | Store setup | ➖ Outside | |

## Security

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 159 | Do secrets stay on the server? | Yes | Check | A setting without `"browser": true`: in routes, not in the page | ⬜ Not started | |
| 160 | Are server bundles blocked from download? | Yes | Check | GET of this theme's `.server.mjs`: refused | ⬜ Not started | |
| 161 | Is the registry (plugins.json) blocked from download? | Yes | Check | GET of `plugins.json`: refused | ⬜ Not started | |
| 162 | Are file paths checked so nothing outside the package folder is served? | Yes | Check | `../` file requests: refused | ⬜ Not started | |
| 163 | Is the preview switch off in production by default? | Yes | Check | Store code (`NODE_ENV`, `RUNTIME_THEME_PREVIEW`) | ⬜ Not started | |
| 164 | Can a browser skip a route override? | No | Base | (No is the safe answer here) | ⛔ Blocked | |
| 165 | Is partner code sandboxed? | No | Base | Re-check: `"sandbox": true` (see notes) | ⛔ Blocked | |
| 166 | Are plugin routes rate-limited? | No | Base | Re-check: 120 calls a minute (see notes) | ⛔ Blocked | |
| 167 | Do plugin routes check who the shopper is? | Partial | Check | Route answering 401 without `context.user` | ⬜ Not started | |
| 168 | Are SVG files from packages blocked from running script? | Partial | Check | Response headers of this theme's SVG | ⬜ Not started | |

## Production

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 169 | Do the production builds pass? | Yes | Outside | Store build | ➖ Outside | |
| 170 | Has the production server been run end to end? | Not tested | Outside | Production run | ➖ Outside | |
| 171 | Does this work with several servers in production? | Partial | Outside | Production setup | ➖ Outside | |
| 172 | Can package files be stored in shared or blob storage? | No | Base | | ⛔ Blocked | |
| 173 | Can packages be updated with zero downtime? | Yes | Check | Shown with 8 (no restart) | ⬜ Not started | |
| 174 | Is there a memory cost for many hot updates? | Partial | Outside | Platform measurement | ➖ Outside | |
| 175 | Are package errors logged on the server? | Yes | Check | Route that throws: store log line | ⬜ Not started | |
| 176 | Is package activity monitored (New Relic)? | Not tested | Outside | Monitoring setup | ➖ Outside | |
| 177 | Is there an audit log of package changes? | No | Base | (`.history` keeps plugins.json copies) | ⛔ Blocked | |
| 178 | Is the registry backed up? | No | Base | | ⛔ Blocked | |
| 179 | Does the Docker image include the runtime package folder? | Not tested | Outside | Store Docker image | ➖ Outside | |
| 180 | Can package files be served from a CDN? | Partial | Outside | Hosting | ➖ Outside | |
| 181 | Is the work committed and pushed? | Partial | Check | This repo on GitHub | ⬜ Not started | |

## Developer experience

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 182 | Is debugging working? | Partial | Check | Source maps + server log | ⬜ Not started | |
| 183 | Are there source maps for package code? | No | Check | Re-check: `.mjs.map` files are built (see notes) | ⬜ Not started | |
| 184 | Do package errors show in the logs? | Yes | Check | Same as 175 | ⬜ Not started | |
| 185 | Is the page safe if a plugin crashes? | Yes | UI | A slot that throws: page still renders | ⬜ Not started | |
| 186 | Is there hot reload while developing a package? | Partial | Check | `npm run dev`: save, refresh | ⬜ Not started | |
| 187 | Can I write packages in TypeScript? | Yes | Check | This repo (`.tsx`) | ⬜ Not started | |
| 188 | Are packages type-checked against the public API when built? | Yes | Check | A wrong prop type: build fails | ⬜ Not started | |
| 189 | Does a package build quickly (seconds)? | Yes | Check | Timed `npm run build` | ⬜ Not started | |
| 190 | Can I lint a package? | No | Check | Add ESLint to this repo (`npm run lint`) | ⬜ Not started | |
| 191 | Can I unit test a package? | No | Check | Add unit tests to this repo (`npm test`) | ⬜ Not started | |
| 192 | Are there end-to-end tests for packages? | No | Check | Add a browser test with `scripts/` + puppeteer | ⬜ Not started | |
| 193 | Can I run the store locally with packages? | Yes | Check | Local store at localhost:3000 with this theme | ⬜ Not started | |

## Upgrades

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 194 | Can I upgrade base without breaking packages? | Partial | Outside | Store upgrade | ➖ Outside | |
| 195 | Is the extension API versioned? | Yes | Check | `apiVersion` (17) | ⬜ Not started | |
| 196 | Are breaking API changes detected automatically? | No | Base | | ⛔ Blocked | |
| 197 | Is the webstore on Next 16? | Yes | Outside | Store repo | ➖ Outside | |
| 198 | Do the hook points need regenerating after a base upgrade? | Yes | Outside | Store repo | ➖ Outside | |

## Base code

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 199 | How many base code edits does all this need? | 0 | Check | Every scenario here: no store-repo edit | ⬜ Not started | |

## Approaches

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | Does the SWC build-time approach still work alongside runtime packages? | Yes | Outside | Store repo | ➖ Outside | |
| 201 | Does an SWC build-time change need a build and deploy? | Yes | Outside | Store repo | ➖ Outside | |
| 202 | Does a runtime package change need a build or deploy? | No | Check | Shown with 8 (no store build) | ⬜ Not started | |
| 203 | Can a customer use only SWC build-time themes? | Yes | Outside | Store repo | ➖ Outside | |
| 204 | Can a customer use only runtime packages? | Yes | Outside | Store setup | ➖ Outside | |

## Features

| # | Use case | Listed | How | Plan in this repo | Progress | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 205 | Do the home pages of the 4 stores match live? | Yes | Outside | spp-content-* packages | ➖ Outside | |
| 206 | Do the listing pages of the 4 stores match live? | Yes | Outside | spp-base package | ➖ Outside | |
| 207 | Do the product pages of the 4 stores match live? | Partial | Outside | spp-base package | ➖ Outside | |
| 208 | Do the empty cart pages match live? | Partial | Outside | spp-base package | ➖ Outside | |
| 209 | Do cart and checkout with items match live? | Not tested | Outside | SPP stores | ➖ Outside | |
| 210 | Does the Artifi logo upload work on the product page? | Yes | Outside | artifi package | ➖ Outside | |
| 211 | Do product images come from Artifi on all 4 stores? | Yes | Outside | artifi package | ➖ Outside | |
| 212 | Does NVIDIA's size grid add sizes to the cart? | Yes | Outside | SPP packages | ➖ Outside | |
| 213 | Does Land O'Lakes' brand selector work? | Yes | Outside | spp-base package | ➖ Outside | |
| 214 | Does the small-order plugin work? | Yes | Outside | small-order package | ➖ Outside | |
| 215 | Does the sort-order plugin work? | Partial | Outside | sort-order package | ➖ Outside | |
| 216 | Is the Delivery Preference feature ready? | Partial | Outside | delivery-preference package | ➖ Outside | |
| 217 | Does the page builder list package widgets with their settings? | Yes | Check | Needs the page-builder app running | ⬜ Not started | |
