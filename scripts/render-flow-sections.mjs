// Adds (or refreshes) a "How it renders" section in each scenario's README, from FLOWS below: where the scenario lands in
// the webstore's own rendering (base) and where this repository's package joins it (customization), each with a link to
// the matching section of docs/RENDER-FLOW.md. Run after adding a scenario: node scripts/render-flow-sections.mjs
import fs from "node:fs";
import path from "node:path";

const DOC = "../../RENDER-FLOW.md";
const S = {
  install: `${DOC}#1-from-this-repository-to-the-store-install-registry`,
  store: `${DOC}#2-which-store-which-packages-every-request`,
  shell: `${DOC}#3-the-page-shell-root-layout-head-styles-labels-server-layout`,
  card: `${DOC}#4-worked-example-the-product-card-on-a-category-page`,
  pdp: `${DOC}#5-product-details-page`,
  cart: `${DOC}#6-add-to-cart`,
  checkout: `${DOC}#7-cart-checkout-place-order`,
  header: `${DOC}#8-header-footer-search`,
  pages: `${DOC}#9-home-content-and-package-pages-widgets`,
};

const NO_PAGE = "No page render: this happens in the build / install step, before any request.";
const HEADER_BASE = `the layout JSON's header item → agent \`getHeaderInitialDetails\` (portal logo, mega-menu categories) → \`HeaderRender\` → \`Header\` (\`<header id="webstore-header">\`) ([§8 A](${S.header}))`;
const HEADER_HOOK = `\`HeaderRender\` → \`RuntimeHeader\` → \`<RuntimeSlot name="layout.header">\`: the theme's \`AnnouncementBar\` slot gets the store's header as \`children\` and renders its bars around it ([§8 B](${S.header}))`;
const CSS_HOOK = (file) => `\`<RuntimeStyles/>\` in the root layout links the theme's stylesheet (\`${file}\`, built into \`spp-customization-<v>.css\`) after the store's CSS, served from the plugin folder by \`/api/extensions/files/<file>\` ([§3 B.1, B.6](${S.shell}))`;
const HOME_BASE = `\`[locale]/page.tsx\` → \`getPage({ url: "home" })\` → agent \`getPageByPageCode\` → \`GET {API_URL}v2/visual-editor/pages/…\` → \`preparedContentItem\` → \`<PageRender>\` ([§9 A](${S.pages}))`;
const LISTING_BASE = `\`category/[id]/page.tsx\` → page JSON (agent \`getPageByPageCode\`) → \`preparedContentItem\` → agent \`categoryProductList\` → \`GET {API_URL}v2.1/categories/{code}/products\` → \`ProductListPageRender\` → \`CategoryProductList\` → \`ProductList\` → \`ProductViews\` → \`ProductCard\` ([§4 A](${S.card}))`;
const PDP_BASE = `\`product/[id]/page.tsx\` → agent \`getProductInformation\` → \`GET {API_URL}v2/published-products/{id}\` → \`ProductDetailsPage\` → \`ProductBasicInfo\` (image, name, price, variants, \`AddToCart\`) ([§5 A](${S.pdp}))`;
const EDITOR_HOOK = `the page builder loads the edited store's manifest (\`/api/extensions?store=\`), \`RuntimePageEditor\` → \`addRuntimeWidgets\` adds the package's widgets (label, category, fields, defaults; fields merged into an existing type) and \`linkRuntimeStyles\` links the packages' CSS into the editor ([§9 B.4](${S.pages}))`;
const WIDGET_RENDER = `on the store, the page's widget item of that type is carried as \`Text { __runtimeWidget }\` → \`RuntimeTextCarrier\` → \`RuntimeWidget\` renders the package's component in the browser ([§9 B.2](${S.pages}))`;

const FLOWS = {
  "001": [NO_PAGE, `\`npm run deploy\` builds with the published SDK and \`znode install\` writes the files and the \`plugins.json\` entry ([§1](${S.install}))`],
  "002": [NO_PAGE, `\`znode-package.json\` (\`kind\`) is what the SDK builds and what the registry entry is made from ([§1](${S.install}))`],
  "003": [NO_PAGE, `build → pack → install ([§1 steps 1-2](${S.install}))`],
  "004": [NO_PAGE, `the build type-checks \`src/\` against \`extension-api.d.ts\` ([§1 step 1](${S.install}))`],
  "005": [NO_PAGE, `documentation only`],
  "006": [NO_PAGE, `\`znode install\` validates before writing anything ([§1 step 2](${S.install}))`],
  "007": [NO_PAGE, `\`znode install\` checks file ownership from \`plugins.json\` entries (assets are not recorded there) ([§1 step 2](${S.install}))`],
  "008": [HEADER_BASE, `\`npm run deploy\` rewrites \`plugins.json\`; the store re-reads it by modification time ([§1 step 3](${S.install})); the manifest's file URLs carry \`?v=<mtime>\` so browsers fetch the new bundle ([§3 B.2](${S.shell})); ${HEADER_HOOK}`],
  "009": [NO_PAGE, `install replaces the previous version's code files; \`scripts/deploy.mjs\` also keeps the zip in \`<plugin folder>/.versions/\` ([§1](${S.install}))`],
  "010": [NO_PAGE, `\`npm run rollback\` installs a kept zip: same install path, registry entry rewritten ([§1](${S.install}))`],
  "011": [NO_PAGE, `\`npm run uninstall\` removes the registry entry under the lock and the package's files ([§1](${S.install}))`],
  "012": [`every request resolves its store from the host (proxy → domain → portal) ([§2 A](${S.store}))`, `\`resolveStoreEntries\` picks the first **enabled** theme placed for the store, in \`plugins.json\` order; switching \`enabled\` off makes the next one (redpanda) the store's theme ([§2 B.2](${S.store}))`],
  "013": [`as 012 ([§2 A](${S.store}))`, `only stores listed in the entry's \`"stores"\` get the package from \`resolveStoreEntries\` ([§2 B.2](${S.store}))`],
  "015": [HEADER_BASE, `the setting's value comes from the registry entry (or a store attribute) → \`getBrowserManifest\` passes only \`"browser": true\` settings to the browser part → \`AnnouncementBar\` reads \`settings.supportPhone\` ([§2 B.3](${S.store}), [§3 B.2](${S.shell})); ${HEADER_HOOK}`],
  "016": [NO_PAGE, `\`znode install\` lists required settings without a value ([§1 step 2](${S.install}))`],
  "017": [NO_PAGE, `\`znode install\` refuses another \`apiVersion\`; the store skips a server bundle whose \`apiVersion\` differs (\`registry.server.ts:89\`) ([§1](${S.install}))`],
  "022": [NO_PAGE, `\`znode create\` writes a starter package ([§1](${S.install}))`],
  "024": [`the root layout writes \`<html data-theme="…">\` and inlines the portal's theme CSS ([§3 A](${S.shell}))`, `${CSS_HOOK("src/styles/tokens.css")}; its \`html[data-theme]\` rules outrank the store's \`:root\` tokens`],
  "026": [HOME_BASE, `\`resolveStoreEntries\` adds the parent chain (spp-base, then the theme) ([§2 B.2](${S.store})); \`RuntimePageRender\` → \`getRuntimePage("/")\` uses the theme's \`src/pages/home.json\` as the page content ([§9 B.1](${S.pages})); the parent's widgets in it render through ${WIDGET_RENDER}`],
  "027": [`as 024 ([§3 A](${S.shell}))`, `the chain is now spp-base → redpanda → spp-customization ([§2 B.2](${S.store})); \`<RuntimeStyles/>\` links the three stylesheets in that order, so the nearest theme wins ([§3 B.1](${S.shell}))`],
  "028": [`as 024 ([§3 A](${S.shell}))`, `${CSS_HOOK("src/styles/fonts.css")}; its \`@font-face\` loads \`spp-customization-geist-latin.woff2\` from the same files route`],
  "029": [LISTING_BASE, `${CSS_HOOK("src/styles/listing.css")}; the rules target the store card's \`.product-card.card\` class and \`data-test-selector\` hooks ([§4 B.2](${S.card}))`],
  "030": [`the root layout renders header to footer inside \`<RuntimeServerSlot name="layout.root">\` ([§3 A](${S.shell}))`, `the theme's server part \`serverSlots["layout.root"]\` (\`ThemeLayout.tsx\`) gets the store's page as \`children\` and the settings (registry or store attribute), and wraps it in a \`<div>\` whose CSS variables override the theme's tokens ([§3 B.4](${S.shell}), [§2 B.3](${S.store}))`],
  "031": [HEADER_BASE, `the build drops the copied rules the store's page already has (\`dedupeStyles\`) ([§1](${S.install})); ${CSS_HOOK("src/styles/trust-strip.css")}; ${HEADER_HOOK} and adds \`TrustStrip\` after the header`],
  "032": [`\`apps/webstore/src/i18n/request.ts\` loads \`messages/<locale>.json\`; components read labels through next-intl (\`Product.sku\`, …) ([§3 B.7](${S.shell}))`, `\`withRuntimeMessages\` deep-merges the theme's \`src/i18n/labels.json\` over the store's messages, so the same components print the theme's wording ([§3 B.7](${S.shell}))`],
  "033": [HEADER_BASE, `\`layout.root\` (\`ThemeLayout.tsx\`) turns the \`logoUrl\` setting into \`--spp-logo\` and \`data-logo="custom"\` on its wrapper ([§3 B.4](${S.shell})); the theme's CSS makes the header's logo images show that file ([§3 B.1](${S.shell}))`],
  "034": [`as 012 ([§2 A](${S.store}))`, `the store is placed on the theme's entry and removed from redpanda's; \`resolveStoreEntries\` now returns spp-customization's chain for POCSppDemo ([§2 B.2](${S.store}))`],
  "035": [`as 012 ([§2 A](${S.store}))`, `one registry change; the next request reads the new \`plugins.json\` (mtime) and resolves redpanda ([§1 step 3](${S.install}), [§2 B.2](${S.store}))`],
  "036": [`as 012 ([§2 A](${S.store}))`, `\`/api/extensions/preview?theme=\` sets the \`runtimeThemePreview\` cookie; \`getRequestStore\` passes it and \`resolveStoreEntries\` uses that theme for this browser only ([§2 B.1, B.4](${S.store})); the \`PreviewBanner\` in ${HEADER_HOOK}`],
  "037": [`the page builder renders the store's page JSON in its canvas ([§9 A](${S.pages}))`, EDITOR_HOOK + `; server slots (\`layout.root\`) do not run in the editor, hence the CSS fallbacks`],
  "038": [HOME_BASE, `${EDITOR_HOOK}; ${WIDGET_RENDER}`],
  "039": [`no page: an API route of the theme`, `\`GET /api/extensions/plugins/spp-customization/shipping-cutoff\` → \`runPluginRoute\` (enabled-for-store check, limits) → the theme's \`routes["shipping-cutoff"](request, context)\` with \`context.settings\` ([§7 B.5](${S.checkout})); the trust strip fetches it in the browser ([§8 B](${S.header}))`],
  "041": [`the store's responsive layout ([§3 A](${S.shell}))`, `${CSS_HOOK("src/styles/mobile.css")}; only the theme's own bars (from \`layout.header\`) change on phones`],
  "042": [`\`Header\` → \`Search.tsx\` renders \`<SearchBox>\` inside \`<RuntimeSlot name="header.search">\` ([§8 A.2, B](${S.header}))`, `the theme's \`SearchWithPopular\` slot gets the store's \`SearchBox\` as \`children\`, keeps it, adds the popular terms ([§8 B](${S.header}))`],
  "043": [PDP_BASE, `\`AddToCart.tsx\` → \`RuntimeAddToCart\` → \`<RuntimeSlot name="product.addToCart">\`: \`CustomizeToOrder\` returns the store's \`children\` or, for listed SKUs, its own element instead ([§5 B](${S.pdp})); slot order decides what wins (artifi after the theme, [§3](${S.shell}))`],
  "046": [HEADER_BASE, `the theme and the spp-commerce plugin both fill \`layout.header\`; \`RuntimeSlot\` passes each one what the earlier rendered (theme chain first, then plugins) ([§3 slot composition](${S.shell}), [§8 B](${S.header}))`],
  "047": [HEADER_BASE, `plugins fill a slot in \`plugins.json\` order (\`resolveStoreEntries\`); the later one wraps the earlier, so its bar is on top ([§2 B.2](${S.store}), [§3 slot composition](${S.shell}))`],
  "048": [HEADER_BASE, `\`HeaderScrollState\` (rendered from the \`layout.header\` slot) sets \`html[data-spp-scrolled]\`; ${CSS_HOOK("src/styles/header.css")} ([§8 B](${S.header}))`],
  "049": [`the layout JSON's footer → \`FooterRender\` (\`<footer>\` with page-builder content) ([§8 A.3](${S.header}))`, `\`RuntimeHeader\` adds a \`[data-runtime-slot="layout.footer"]\` container next to \`#webstore-header\` and portals \`<RuntimeSlot name="layout.footer">\` into it; \`FooterHelp\` moves that container before the visible footer ([§8 B](${S.header}))`],
  "050": [LISTING_BASE, `\`ProductViews\` → \`RuntimeProductViews\` → \`<RuntimeSlot name="productList.layout" { productData, part }>\` → \`ProductListing\` draws the theme's cards from \`productData.productList\`; the store's sort bar and facets are portaled in as parts; the store's listing stays mounted, hidden, and is shown again for the fallback ([§4 B](${S.card}))`],
  "051": [`click → \`useAddToCart\` → \`POST /api/add-to-cart\` → agent \`addToCartProduct\` → \`POST {API_URL}commerceapi/v1/carts/add-to-cart\` → cart count and popup data in the store's state ([§6 A](${S.cart}))`, `\`AddToCartNotification\` → \`RuntimeAddToCartNotification\` (transform \`addToCart.notificationData\`) → \`<RuntimeSlot name="addToCart.notification" { data }>\` → \`AddedToCart\`, opened by the store's cart count (\`host.stores.useCartCount()\`) ([§6 B](${S.cart}))`],
  "052": [`the root layout renders header to footer inside \`<RuntimeServerSlot name="layout.root">\` ([§3 A](${S.shell}))`, `\`RuntimeServerSlot\` calls the theme's server part \`serverSlots["layout.root"]\`, which renders the skip link and the dated notice (server-side, from settings) before the store's page ([§3 B.4](${S.shell}))`],
  "053": [`the root layout's \`<head>\` ([§3 A](${S.shell}))`, `\`RuntimeRoot\` renders \`<RuntimeSlot name="layout.head" { store, theme }>\`; \`HeadTags\` returns \`<meta>\`, \`<link>\`, \`<script async src>\`, which React places in \`<head>\` on the server render ([§3 B.3](${S.shell}))`],
  "054": [LISTING_BASE, `as 050: \`productList.layout\` → \`ProductListing\`, which now adds the quick filters above the theme's grid ([§4 B](${S.card}))`],
  "055": [PDP_BASE, `${CSS_HOOK("src/styles/pdp.css")} for the buy box; \`product.addToCart\` → \`ProductFacts\` under the store's button ([§5 B](${S.pdp}))`],
  "056": [`cart page → \`GET /api/cart/get-cart-items\` → agent \`getCartItems\` → \`GET {API_URL}commerceapi/v1/{classType}/item-list/{classNumber}\` → \`Cart\` ([§7 A](${S.checkout}))`, `${CSS_HOOK("src/styles/cart.css")}; no cart slot ([§7 B](${S.checkout}))`],
  "057": [`checkout page → \`Checkout\` → \`AddressWrapper\`, \`ShippingOptions\`, payment, summary ([§7 A](${S.checkout}))`, `${CSS_HOOK("src/styles/checkout.css")} ([§7 B](${S.checkout}))`],
  "059": [HOME_BASE, `${EDITOR_HOOK}; ${WIDGET_RENDER}`],
  "060": [`the page builder for a store ([§9 A](${S.pages}))`, `the editor gets the packages \`resolveStoreEntries\` returns for that store ([§2 B.2](${S.store})): the theme's widgets where the theme runs, spp-widgets' wherever it is placed; ${EDITOR_HOOK}`],
  "061": [`the page builder for a store ([§9 A](${S.pages}))`, `the spp-commerce plugin is placed for the store, so its widget is in the editor's config: ${EDITOR_HOOK}`],
  "062": [`the page builder ([§9 A](${S.pages}))`, `the widget's \`fields\` become the editor's panel for that block: ${EDITOR_HOOK}`],
  "063": [`the page builder ([§9 A](${S.pages}))`, `Puck field definitions (incl. a \`custom\` field's \`render\`) passed through \`addRuntimeWidgets\` ([§9 B.4](${S.pages}))`],
  "064": [`the page builder ([§9 A](${S.pages}))`, `\`defaultProps\` (a getter here) read by \`addRuntimeWidgets\` when the editor builds its config ([§9 B.4](${S.pages}))`],
  "065": [`the page builder ([§9 A](${S.pages}))`, `\`category\` decides the component-list group in \`addRuntimeWidgets\` ([§9 B.4](${S.pages}))`],
  "066": [`the page builder ([§9 A](${S.pages}))`, `the editor previews a package widget with \`RuntimeWidget\`, the same component the store renders ([§9 B.2, B.4](${S.pages}))`],
  "068": [HOME_BASE, `registering an existing type: \`addRuntimeWidgets\` merges the fields and defaults into the type's config ([§9 B.4](${S.pages})); on the store \`RuntimeWidget\` renders the package's component for that type ([§9 B.2](${S.pages}))`],
  "069": [HOME_BASE, `${CSS_HOOK("src/styles/card-grid.css")}; the parent's widget is unchanged`],
  "070": [HOME_BASE, `\`DeliveryDates\` registered by the theme: ${WIDGET_RENDER}; the type's saved props are read as they are`],
  "071": [`the page builder ([§9 A](${S.pages}))`, `\`linkRuntimeStyles\` links the theme's CSS into the editor; \`src/styles/editor.css\` hides list items by their drag-and-drop ids ([§9 B.4](${S.pages}))`],
  "072": [`the page builder ([§9 A](${S.pages}))`, `as 071: \`linkRuntimeStyles\`, then CSS \`order\` on the categories ([§9 B.4](${S.pages}))`],
  "077": [`the page builder for a store ([§9 A](${S.pages}))`, `spp-widgets' \`"stores"\` decides which stores' editors get it ([§2 B.2](${S.store}), [§9 B.4](${S.pages}))`],
};

const root = "docs/scenarios";
let count = 0;
for (const folder of fs.readdirSync(root)) {
  const number = folder.slice(0, 3);
  const flow = FLOWS[number];
  const file = path.join(root, folder, "README.md");
  if (!flow || !fs.existsSync(file)) continue;
  const section = `## How it renders\n\n**In the webstore (base):** ${flow[0]}\n\n**How this customization joins it:** ${flow[1]}\n\nEnd-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](${DOC}).\n`;
  let text = fs.readFileSync(file, "utf8").replace(/\n## How it renders\n[\s\S]*?(?=\n## |\s*$)/, "\n").trimEnd();
  // before "## Where" when there is one, else at the end
  text = text.includes("\n## Where") ? text.replace("\n## Where", `\n${section}\n## Where`) : `${text}\n\n${section}`;
  fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
  count++;
}
console.log(`${count} scenario READMEs have a "How it renders" section`);
