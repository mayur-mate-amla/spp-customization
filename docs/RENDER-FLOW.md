# How a page renders, and where each customization joins it

This document traces, end to end, how the webstore renders a page **from the Znode API to the HTML**, and how this
repository's packages (the `spp-customization` theme, the `spp-commerce` and `spp-promos` plugins, the `spp-widgets`
widget package) join that path **without any change to the webstore**. Every scenario in [`SCENARIOS.md`](../SCENARIOS.md)
is listed at the end with its commit(s) and the exact place in this flow where it acts; each scenario's README has a
"How it renders" section pointing back here.

Paths in the tables are in the **webstore repository** (`znode-webstore10x-page-builder`) unless they start with
`src/`, `scripts/` or a manifest name, which are in **this** repository. Line numbers were read from the webstore source
on 10 Nov 2026 and may move as it changes; the function names are the stable reference.

**Two separate areas**, kept apart in every section below:

- **A. The webstore (base)**: Znode API → client → agent → page / BFF route → page-builder render → base component.
- **B. The customization (runtime packages)**: plugin folder → registry → manifest → slots, widgets, styles, labels,
  server slots, routes and hooks that wrap or replace parts of A at fixed hook points.

```
   Shopper's browser                         Webstore (Next.js, apps/webstore)                        Znode
 ┌──────────────────┐   request   ┌───────────────────────────────────────────────────────────┐   REST   ┌──────────┐
 │ URL / click      │ ──────────▶ │ proxy.ts ─▶ page.tsx / api route ─▶ agent ─▶ client ───────┼────────▶ │ API      │
 │                  │             │      ▲             │                                        │          │ (portal, │
 │ HTML + hydrate   │ ◀────────── │      │       page-builder render ─▶ base components        │ ◀─────── │ catalog, │
 └──────────────────┘             │      │             ▲  hook points (withRuntimeWrapper,      │   JSON   │ cart,    │
         ▲  /api/extensions/files │      │             │  RuntimeSlot, RuntimeServerSlot, ...)  │          │ CMS)     │
         └────────────────────────┤  B: packages/extensions ◀── plugins.json + package files    │          └──────────┘
                                  └───────────────────────────── (RUNTIME_PLUGINS_DIR) ─────────┘
```

---

## 1. From this repository to the store (install, registry)

Nothing in the webstore is rebuilt. A package becomes part of a store like this:

| # | Step | Where |
| --- | --- | --- |
| 1 | `npm run deploy` builds the package: TypeScript checked against `extension-api.d.ts`, `src/server.tsx` → `<name>-<v>.server.mjs`, `src/browser.tsx` → `<name>-<v>.browser.mjs`, `src/styles/*.css` → one stylesheet, assets, labels, pages | `scripts/deploy.mjs` → `znode-plugin/lib/znode-package.mjs` (`build`, `pack`) |
| 2 | `znode install`: validates (name, version, kind, apiVersion, files, types, size, ownership), copies the flat files into the plugin folder, writes the entry into `plugins.json` under a lock (previous registry kept in `.history/`) | `znode-package.mjs` (`install`, `lockRegistry`, `writeRegistry`) |
| 3 | The store reads `plugins.json` again when its modification time changes (no restart) and indexes it per store | `packages/extensions/src/registry.server.ts:73-80` `readRegistry`; `registry-index.ts:56-109` `buildRegistryIndex` |
| 4 | Placement: `"enabled"`, `"stores"` (or per-store `installations`), entry order, theme `"parent"` | `plugins.json`; changed here with `scripts/registry.mjs` |

## 2. Which store, which packages (every request)

**A. Base**

| # | Hop | Where |
| --- | --- | --- |
| 1 | Every page and API request goes through the proxy (package files skip it) | `apps/webstore/src/proxy.ts:31-54` `proxy` |
| 2 | Host → domain → portal: `GET {API_URL}v2/domains?filter=domainname~eq~"<host>"`, then `GET {API_URL}v2.1/portals/{StoreCode}/application/{ApplicationType}`; cached as `Portal_<host>` | `packages/utils/src/server/middleware/global-caching-helper.ts:48, 172, 198-229, 253, 289-297` |
| 3 | The built-in theme: dev `?theme=` / cookie, `THEME_OVERRIDE`, else the portal's; normalised (`""`, `base`, `b2b` → `base`); sent as `x-theme-name` header | `packages/utils/src/theme/theme-proxy.ts:12-26, 57-61`; `theme-name.ts:4, 14-17` |
| 4 | Server code reads the store from the portal header | `packages/utils/src/server/portal/portal-headers.ts:33` `getPortalHeader`; agent `packages/agents/src/portal/portal.ts:63` `getPortalDetails` |

**B. Customization**

| # | Hop | Where |
| --- | --- | --- |
| 1 | The request's store, built-in theme and preview: `{ code: portal.storeCode, theme, preview }`; preview = cookie `runtimeThemePreview` (dev, or `RUNTIME_THEME_PREVIEW=true`) | `packages/extensions/src/registry.server.ts:112-116` `getRequestStore`; `route-overrides.server.ts:41-43` |
| 2 | The store's packages: its placements and every-store ones, in `plugins.json` order; the **theme** = the previewed one, else the first enabled theme placed for the store; then its **parent chain, root first**; then the **plugins** | `registry-index.ts:122-161` `resolveStoreEntries` (memoized per store/theme/preview) |
| 3 | Settings per store: the entry's settings, store attributes for fields with `"attribute"` | `registry.server.ts:123-148` `getStoreEntries`, `withStoreAttributes` |
| 4 | Preview switch: `/api/extensions/preview?theme=<name>[&to=/path]` sets the cookie | `apps/webstore/src/app/api/extensions/preview/route.ts:9-27` |

## 3. The page shell: root layout, head, styles, labels, server layout

**A. Base** (`apps/webstore/src/app/[locale]/layout.tsx`)

| # | Hop | Line |
| --- | --- | --- |
| 1 | Theme name → `<html data-theme="…">` (what `html[data-theme]` CSS selectors match) | :72, :85-87, :96 |
| 2 | The portal's theme CSS inlined | :78, :99-103 |
| 3 | Header and footer page JSON: `getPage({ url: "layout", pageVariant: "Layout" })` | :89-93 |
| 4 | `PageLayout` renders `headerData` / `footerData` with the page-builder renderer | :122-135; `packages/page-builder/src/page-layout/PageLayout.tsx:17-28` |

**B. Customization** (same file)

| # | Hop | Where |
| --- | --- | --- |
| 1 | `<RuntimeStyles/>` in `<head>`: one `<link>` per stylesheet of the store's packages (theme chain first, then plugins), after the store's CSS | `layout.tsx:105` → `packages/extensions/src/RuntimeStyles.tsx:7-16` |
| 2 | `<RuntimeRoot>` puts the **manifest** in the page: `{ store, theme, plugins: [{ name, url: /api/extensions/files/<file>?v=<mtime>, settings }], styles }`; only settings with `"browser": true` are included | `layout.tsx:116` → `RuntimeRoot.tsx:12-21`; `registry.server.ts:212-243` `getBrowserManifest` |
| 3 | `layout.head` slot: what packages render there (`<meta>`, `<link>`, `<script async src>`) React places in `<head>` | `RuntimeRoot.tsx:17` |
| 4 | `layout.root` **server** slot around everything from header to footer: each package's `serverSlots["layout.root"](props + children, { React, store, settings })`, in package order; one that throws is logged and skipped | `layout.tsx:119` → `RuntimeServerSlot.tsx:17-33` |
| 5 | Browser parts: each `<name>.browser.mjs` is imported (on the server for the first render, then in the browser) and its `default(host)` called with `{ apiVersion, React, ReactDOM, store, theme, settings, stores }`; it returns `{ slots, transforms, widgets }` | `packages/extensions/src/client/runtime.ts:65-85, 162-170`; `registry.server.ts:346-360` |
| 6 | Package files are served from the plugin folder: browser bundles, CSS, fonts, images, `.mjs` assets; server bundles and `plugins.json` are refused | `apps/webstore/src/app/api/extensions/files/[file]/route.ts` → `files-route.server.ts:6-12` → `registry.server.ts:33-49, 246-259` `readServedFile` |
| 7 | Labels: each package's `messages` JSON deep-merged over the store's `messages/<locale>.json`, theme root first | `apps/webstore/src/i18n/request.ts:15` → `registry.server.ts:276-299` `withRuntimeMessages` |

**How a slot composes (all browser slots):** `RuntimeSlot` reduces over the store's packages in the order of §2 B.2.
Each package's component gets the slot's props and, as `children`, what the earlier packages (or the store) rendered;
it can keep, add to or replace it. A component that throws falls back to the earlier output.
(`packages/extensions/src/client/RuntimeSlot.tsx:29-40`.) Consequence: **the last package decides what is shown**; a
plugin that replaces its children hides a theme's output in the same slot (043: artifi and `product.image`).

**Where hook points come from:** base components are wrapped in code with `withRuntimeWrapper(RuntimeX, XBase)`
(`packages/extensions/src/slots/with-runtime-wrapper.tsx`), which replaced the earlier SWC `wrapBase` build step; two
slots are direct `<RuntimeSlot>` calls (`header.search`, `login.form`). A component that is not wrapped has no slot.

---

## 4. Worked example: the product card on a category page

The request: `GET http://sppdemo.localhost:3000/category/1674` (POCSppDemo, Best Sellers).

### A. In the webstore (base): from the Znode API to the card's HTML

```
category/[id]/page.tsx ─▶ getPageStructure ─▶ getPage ─▶ getServerPageStructure ─▶ getProductionPageDetails
   ─▶ agent getPageByPageCode ─▶ client VisualEditor ─▶ GET {API_URL}v2/visual-editor/pages/{pageCode}/{portal}/{profile}
   (the page JSON: which widgets, with what props)
preparedContentItem: widget "ProductListPage" ─▶ agent categoryProductList ─▶ getProductList ─▶ fetchAllProducts
   ─▶ client CategoryContents_productsByCategoryCode ─▶ GET {API_URL}v2.1/categories/{categoryCode}/products?…
fetchAndMapPLPPrices (real-time prices) ─▶ <Client> ─▶ <PageRender>
   ─▶ ProductListPageRender ─▶ CategoryProductList ─▶ ProductList ─▶ ProductViews ─▶ GridView / ListView
   ─▶ ProductCard ─▶ ProductCardBase (the card's markup)
```

| # | Hop | Where |
| --- | --- | --- |
| 1 | Page route asks for the page structure of `category/1674` | `apps/webstore/src/app/[locale]/category/[id]/page.tsx:38` → `packages/page-builder/src/utils/get-page-structure.ts:19` |
| 2 | The page JSON from Znode's visual editor | `get-page.ts:113` → `page-structure/get-server-page-structure.ts:20-21` → `base-components/src/http-request/visual-editor/page/page.ts:8` → **agent** `packages/agents/src/visual-editor/visual-editor.ts:13` `getPageByPageCode` → **client** `packages/clients/src/znode-client/V2/visual-editor.ts:17,24` → `GET {API_URL}v2/visual-editor/pages/{pageCode}/{portalCode}/{profileCode}` |
| 3 | Each widget's data is prepared on the server; the listing widget's handler | `get-page.ts:133` → `process-header-footer-and-content-data.ts:72` → `prepared-content-item.ts:104` (`"ProductListPage"` → `categoryProductList`; skipped with `ENABLE_PAGE_CACHE=true` and no search params, 158-159) |
| 4 | The products | **agent** `packages/agents/src/category-product-list/categoryProductList.ts:17-26` → `agents/src/product/product.ts:107` `getProductList` → `fetchAllProducts` → **client** `packages/clients/src/znode-client/V2/category-contents.ts:36,59` → `GET {API_URL}v2.1/categories/{categoryCode}/products?catalogCode&localeCode…` |
| 5 | Real-time prices mapped onto the list | `category/[id]/page.tsx:59-62` `fetchAndMapPLPPrices` |
| 6 | Render: `<Client>` → `<RuntimePageRender><PageRender/></RuntimePageRender>` | `category/[id]/page.tsx:73` → `[locale]/client.tsx:15-17` |
| 7 | The listing widget's components | `ProductListPageRender.tsx:24` → `base-components/src/components/page-widget/category-product-list/CategoryProductList.tsx:44` → `product/product-list/ProductList.tsx:18` → `product-views/ProductViews.tsx:259` (wrapped) → `GridView` / `ListView` (217-235) |
| 8 | The card | `common/product-card/ProductCard.tsx:33-166` `ProductCardBase`: `divProductCard{id}`, `divProductImage{id}`, `linkProductImage{id}`, `imgProduct{id}`, `divQuickView{id}`, `divProductDetails{id}`, `hdgProductName{id}`, `spnProductSkuValue{id}`, `btnViewDetails{id}`, and its `AddToCart` |

The same card is used by carousels, link products and recently viewed products (they all import
`common/product-card`). The built-in themes `base` and `custom1` use the base page-builder config, so the same card;
`bstore` has its own card, which is not wrapped.

### B. How the customization joins it

```
plugins.json (POCSppDemo: spp-base ▸ redpanda ▸ spp-customization, then plugins)      [§2 B]
  ─▶ <RuntimeStyles>: spp-base.css, redpanda.css, spp-customization.css (tokens, listing.css, product-card.css)
  ─▶ manifest ─▶ spp-customization.browser.mjs setup(host) ─▶ { slots, transforms, widgets }
ProductViews (wrapped) ─▶ RuntimeProductViews
   1. transform "productList.data" (none here)
   2. a package has "productList.layout"?  yes (spp-customization)
        ─▶ <RuntimeSlot "productList.layout" { productData, isFromSearch, part }>   ─▶ ProductListing (050, 054)
        ─▶ the store's listing stays mounted, hidden: <div hidden data-runtime-base="product.list">
        ─▶ parts: the store's sort bar and facet chips portaled into part("productList.filter" / "productList.facets")
ProductCard (wrapped) ─▶ RuntimeProductCard ─▶ <RuntimeSlot "product.card" { product, selectedMode }> ─▶ ProductBadge
labels: "Product.sku" etc. merged from src/i18n/labels.json (032)
```

| # | Hop | Where |
| --- | --- | --- |
| 1 | The store's packages and their order | §2 B.2 |
| 2 | Styles on the card: design tokens (`html[data-theme] { --primary … }`), the listing refresh on `.product-card.card` and its `data-test-selector` hooks | `src/styles/tokens.css` (024), `src/styles/listing.css` (029) → §3 B.1 |
| 3 | The listing wrapper: transform `productList.data`, then `productList.layout` when a package has it | `packages/extensions/src/slots/RuntimeSlots.tsx:223-239` `RuntimeProductViews` |
| 4 | The theme's listing: its own card for every product of the page, quick filters, the store's sort bar and facets as parts; falls back to the store's own (hidden) listing for paged listings or with `themeCards: false` | `src/slots/ProductListing.tsx` (050, 054) |
| 5 | The parts: the store's filter bar and facet chips render into the layout's targets | `ProductListFilter.tsx:100` → `RuntimeListFilter` (`RuntimeSlots.tsx:241`); `FacetChipList.tsx:118` → `RuntimeFacetChips` (245); `Part` (56-59) |
| 6 | The store's card, when it shows: `product.card` wraps it | `ProductCard.tsx:169` `withRuntimeWrapper(RuntimeProductCard, ProductCardBase)` → `RuntimeSlots.tsx:163-169` → `src/slots/ProductBadge.tsx` ("New" badge) |
| 7 | Labels on the card ("Item #", "See what buyers say", "Ready to ship") | `src/i18n/labels.json` (032) → §3 B.7 |

Result on the page: the store's data (step A.4) is drawn by the theme's card (B.4) inside the store's page, with the
store's own sort bar and facets, styled by the theme's CSS. No store file changed.

---

## 5. Product details page

**A. Base**

| # | Hop | Where |
| --- | --- | --- |
| 1 | `product/[id]/page.tsx:29` `getPageStructure("product/"+id)` (same page-JSON path as §4 A.2); price `fetchAndMapPDPPrice` (:50-53) | `apps/webstore/src/app/[locale]/product/[id]/page.tsx` |
| 2 | `"ProductDetailsPage"` → **agent** `getProductInformation` → `getProductData` → `getProductDetails` → **client** `GET {API_URL}v2/published-products/{publishProductId}` (configurable children via `getConfigurableProduct`) | `prepared-content-item.ts:105`; `agents/src/product/product.ts:592-656, 731`; `product-details.ts:82,104`; `clients/.../V2/publish-products.ts:29,42` |
| 3 | `ProductDetailsPageRender` → `ProductDetailsPage` → `ProductBasicInfo` (image `divProductImage{id}`, `hdgProductName`, `divSKU`, `divPrice`, variants, `AddToCart`), tabs, `AddToCartNotification` | `ProductDetailsPageRender.tsx:8-24`; `page-widget/product-details-page/ProductDetailsPage.tsx:17-58`; `ProductBasicInfo.tsx:186-331` |

**B. Customization**

| Hook | Where | Used by |
| --- | --- | --- |
| The page widget's own settings exposed as `page` to product slots | `RuntimeProductPageWidget` (`RuntimeSlots.tsx:33-36`) | – |
| `product.layout` (whole details area; the base stays mounted, hidden; parts: image, variants, addToCart) | `ProductBasicInfo.tsx:359` → `RuntimeProductBasicInfo` (`RuntimeSlots.tsx:63-88`) | considered in 055 |
| `product.image` | `ProductImage.tsx:184` → `RuntimeProductImage` (90-100); artifi fills it after the theme | 043 (finding) |
| `product.variants`, `product.variantGrid` | `ConfigurableProductAttribute.tsx:360`, `ConfigurableProductGridData.tsx:192` | – |
| `product.addToCart` (`product` = the details) | `AddToCart.tsx:184` → `RuntimeAddToCart` (127-139) | 043 Customize & order, 055 Key details |
| CSS on the store's markup | `src/styles/pdp.css` | 055 buy box |

## 6. Add to cart

**A. Base**

| # | Hop | Where |
| --- | --- | --- |
| 1 | Click `btnAddToCart{id}` → `setAddToCartProduct` → `addToCart` → `submitAddToCart` | `AddToCart.tsx:133-151`; `useAddToCart.ts:30-39, 458-555` |
| 2 | `POST /api/add-to-cart` (BFF) | `base-components/src/http-request/cart/add-to-cart.ts:6` → `apps/webstore/src/app/api/add-to-cart/route.ts:7-22` |
| 3 | **agent** `addToCartProduct` → **client** `Carts_addToCart` → `POST {API_URL}commerceapi/v1/carts/add-to-cart` | `agents/src/cart/add-to-cart.ts:13, 62`; `clients/.../commerce/carts.ts:96,98` |
| 4 | Cart cookie; cart count; popup data `{ sku, quantity, imageLargePath }` (cleared after 4 s) | `useAddToCart.ts:35-36, 560-578`; `stores/product.ts:104` |
| 5 | The popup | `AddToCartNotification.tsx:13-90` |

**B. Customization**

| Hook | Where | Used by |
| --- | --- | --- |
| Server hooks around the BFF call: `beforeAddToCart(request)` (return a changed request), `afterAddToCart(response)` | `route.ts:16-17` → `request-hooks.server.ts:31-54` | 080, 106, 109 (next) |
| Take over `/api/add-to-cart` entirely (plugin `overrides`) | §7 B.4 | 098, 099 (next) |
| Popup data transform `addToCart.notificationData`, then slot `addToCart.notification` (`data`) | `AddToCartNotification.tsx:93` → `RuntimeAddToCartNotification` (`RuntimeSlots.tsx:141-160`) | 051 |
| The store's cart state in the browser (`host.stores.useCartCount()`, `useUser()`) | `client/runtime.ts` host | 046 account bar, 051 popup |

## 7. Cart, checkout, place order

**A. Base**

| # | Hop | Where |
| --- | --- | --- |
| 1 | Cart page → `GET /api/cart/get-cart-items?cartNumber=` → **agent** `getCartItems` → `GET {API_URL}commerceapi/v1/{classType}/item-list/{classNumber}` | `[locale]/cart/page.tsx:16-28`; `components/cart/Cart.tsx:70`; `api/cart/get-cart-items/route.ts:20-33`; `agents/src/cart/cart-items/cart-items.ts:10,13`; `clients/.../commerce/commerce-collections.ts:28,49` |
| 2 | Cart summary | `api/cart/cart-summary/route.ts:8-35` → `agents/src/cart/cart-summary/cart-summary.ts:24` |
| 3 | Checkout page: `AddressWrapper` (`divShippingAddress`), `ShippingOptions` | `[locale]/checkout/page.tsx:33,46`; `components/checkout/Checkout.tsx:384, 427` |
| 4 | Place order: `POST /api/place-order` → **agent** `placeOrder` → `{API_URL}commerceapi/v1/{classType}/place-order/{classNumber}` | `CheckoutSubmitOrderActions.tsx:25`; `http-request/checkout/place-order.ts:11`; `api/place-order/route.ts:4-23`; `agents/src/checkout/checkout.ts:333`; `commerce-collections.ts:924,931` |

**B. Customization**

| # | Hook | Where |
| --- | --- | --- |
| 1 | `onCartChanged({ store, cart, settings, actions: { addItem, removeLine } })` when the cart is read (per-cart lock); `mapCartItems(items)` before the cart page / checkout show them | `get-cart-items/route.ts:26-28`, `cart-summary/route.ts:22` → `cart-hooks.server.ts:15-89` |
| 2 | `checkout.address`, `checkout.shippingOptions` slots with a `checkout` API object | `AddressWrapper.tsx:635`, `ShippingOptions.tsx:234` → `RuntimeCheckoutSlots.tsx:16-51` |
| 3 | CSS on the cart and checkout markup | `src/styles/cart.css` (056), `src/styles/checkout.css` (057) |
| 4 | **Route override**: the proxy asks `findRouteOverride(store, path)`: the first enabled **plugin** (never a theme: `entry.kind === "theme"` is skipped, row 040) whose `overrides[path]` names one of its routes; the request is rewritten to `/api/extensions/plugins/<plugin>/<route>`; `context.original()` calls the store's route again with a bypass token | `proxy.ts:50, 173-180`; `route-overrides.server.ts:19-22, 63-75` |
| 5 | Plugin routes: enabled-for-store check, rate limit, body limit, timeout; `context` = store, settings, cartNumber, user, `znode()` (raw `{API_URL}` fetch with the store's headers), `original()` | `apps/webstore/src/app/api/extensions/plugins/[plugin]/[route]/route.ts` → `routes.server.ts:98-269` `runPluginRoute` |

## 8. Header, footer, search

**A. Base**

| # | Hop | Where |
| --- | --- | --- |
| 1 | Layout JSON's header item → **agent** `getHeaderInitialDetails` (portal: logo `websiteLogo` + media server; categories `getMegaMenuCategories`) | `prepared-content-item.ts:122-141`; `agents/src/headers/headers.ts:42, ~83`; `category.ts:209` |
| 2 | `HeaderRender` → `Header` (`<header id="webstore-header">`, `imgDesktopLogo`, `Search`) | `HeaderRender.tsx:7-55`; `layout-components/header/Header.tsx:86-99` |
| 3 | Footer: `<footer><DropZone zone="footer"/>` (page-builder content) | `FooterRender.tsx:6-12` |

**B. Customization**

| Hook | Where | Used by |
| --- | --- | --- |
| `layout.header` around the store's header (props = the Header widget's) | `HeaderRender.tsx:58` → `RuntimeHeader` (`RuntimeSlots.tsx:174-218`, :212) | 008, 015, 031, 036, 039, 041, 046-048, 052 |
| `layout.footer`: a container added next to `#webstore-header` once the page is steady, the slot portaled into it | `RuntimeSlots.tsx:179-215` | 049 (moved out of spp-base's hidden header) |
| `header.search` (direct slot around `SearchBox`) | `base-components/.../header/search/Search.tsx:72-74` | 042 |
| Runtime widgets carried into header / footer page content | `RuntimePageLayout` (`RuntimePageSlots.tsx:42-52`), `RuntimeFooterCarrier` (`RuntimeSlots.tsx:266-268`) | – |

## 9. Home, content and package pages; widgets

**A. Base**

| # | Hop | Where |
| --- | --- | --- |
| 1 | `getPage({ url: "home" })` (same page JSON as §4 A.2); widget data handlers, e.g. `ProductsCarouselWidget` → `getProductWidgetList` | `[locale]/page.tsx:35`; `prepared-content-item.ts:109-120` |
| 2 | Content pages by SEO URL | `[...slug]/page.tsx:98-129` |
| 3 | `PageRender` (home/content: in-place config; other types: `getConfig` loaded) | `page-builder/src/page-render/PageRender.tsx:17-72` |

**B. Customization**

| # | Hook | Where | Used by |
| --- | --- | --- | --- |
| 1 | Package **page content** for a URL (`"pages": { "/": "…json" }`): the last package that has the path wins; prepared like the API's page | `client.tsx:15` → `RuntimePageRender` (`RuntimePageSlots.tsx:32-40`) → `getRuntimePage` (`registry.server.ts:314-337`) | 026 home page |
| 2 | **Package widgets**: each runtime type is carried as a `Text` item `{ __runtimeWidget: type }` → `RuntimeWidget` renders the package's component in a `div[data-runtime-widget]`, **in the browser** (row 075); a package widget with an existing type name replaces that type | `widgets.ts:23-29` `carryRuntimeWidgets`; `TextRender.tsx:44` → `RuntimeTextCarrier` (`RuntimeSlots.tsx:254-264`) → `client/RuntimeWidget.tsx:44-52` | 038, 059, 068, 070 |
| 3 | **Server pages** (`serverPages`): the proxy rewrites the path to `/<locale>/runtime-page/<path>`, rendered by the package's server part | `proxy.ts:34, 127-142` → `findRuntimePage` (`route-overrides.server.ts:50-60`) → `[locale]/runtime-page/[...path]/page.tsx:15-19` → `RuntimeServerPage.tsx:26-38` → `getRuntimeServerPage` (`registry.server.ts:184-192`) | welcome page |
| 4 | **Page builder**: the editor loads the edited store's manifest (`/api/extensions?store=` on :3001), adds package widgets to its config (fields merged into an existing type), and links the packages' stylesheets into the editor | `PageEditor.tsx:186` → `RuntimePageEditor.tsx:37-102` (`addRuntimeWidgets`, `linkRuntimeStyles`); `apps/page-builder/src/app/api/extensions/route.ts` | 037, 059-066, 068, 071, 072 |

---

## 10. Every scenario, its commit(s) and where it acts

"Base" is the part of the webstore the scenario lands on (section above); "Customization hook" is where this
repository joins it. Commits are on `main` of this repository.

| # | Use case | Commit(s) | Base (A) | Customization hook (B) | Files here |
| --- | --- | --- | --- | --- | --- |
| 001 | Build a package outside the store repo | 666fc14 | – | §1 build + install | package.json |
| 002 | One package format | 3233bab | – | §1 manifest | znode-package.json |
| 003 | SDK build, pack, install | 8c3aa99 | – | §1 | – |
| 004 | Public API documented | 3130bca | – | §1 type check | – |
| 005 | Docs and examples | ba23503 | – | – | README.md |
| 006 | Validation at install | f74be5f | – | §1 install checks | scripts/bad-packages.mjs |
| 007 | No overwriting other packages (corrected: assets not protected) | 723930f, 5694c21 | – | §1 install ownership | – |
| 008 | Update without restart | 3ab864b | §8 header | §1 step 3 (registry mtime), §3 B.6 (`?v=` file URLs), §8 `layout.header` | src/slots/AnnouncementBar.tsx |
| 009 | Older versions kept | 98f8b45, 9e7b3c1 | – | §1 (+ `.versions/` copy) | scripts/deploy.mjs |
| 010 | One-command rollback | 9a6a3ce | – | §1 install of an older zip | scripts/rollback.mjs |
| 011 | Clean uninstall | cc673e5, 8449cda | – | §1 registry + files | scripts/uninstall.mjs |
| 012 | Switch on/off | 5bf0d48 | §2 A | §2 B.2 (`enabled`, entry order) | scripts/registry.mjs |
| 013 | Some stores only | 447b927 | §2 A | §2 B.2 (`stores`) | – |
| 015 | Required settings | 1b98ed3 | §8 header | §2 B.3 settings, §3 B.2 browser settings, `layout.header` | AnnouncementBar.tsx |
| 016 | Empty required settings reported | ce79d42 | – | §1 install | – |
| 017 | API version | a76185e | – | §1 install, `registry.server.ts:89` load check | – |
| 022 | Scaffold command | 7717e83 | – | §1 (`znode create`) | – |
| 024 | CSS-only tokens | 0805627 | §3 A.1 `data-theme` | §3 B.1 stylesheets | src/styles/tokens.css |
| 026 | Child theme | ae1cced | §9 A home | §2 B.2 parent chain, §9 B.1 page content, §9 B.2 parent's widgets | src/pages/home.json |
| 027 | Multi-level inheritance | 47128bc | §3 | §2 B.2 chain, §3 B.1 order | znode-package.json |
| 028 | Own font files | 7f8b51f | §3 | §3 B.1 + B.6 (font file) | src/styles/fonts.css |
| 029 | Update the CSS | a2600d3 | §4 A.8 card | §3 B.1 | src/styles/listing.css |
| 030 | Fonts and colors per theme | 6f76953 | §3 | §3 B.4 `layout.root` (CSS variables), §2 B.3 attributes | src/server/ThemeLayout.tsx |
| 031 | CSS does not clash | 3da36f4 | §8 header | §1 build (`dedupeStyles`), §3 B.1, §8 `layout.header` | src/slots/TrustStrip.tsx |
| 032 | Labels per theme | 2a0f918 | §4 A.8 card labels | §3 B.7 | src/i18n/labels.json |
| 033 | Logos per store | ec604e7 | §8 A.1 logo | §3 B.4 `layout.root` + CSS | ThemeLayout.tsx, theme.css |
| 034 | Assign a theme per store | 6983a76 | §2 A | §2 B.2 | – |
| 035 | Switch theme without deploy | 3a2e5bb | §2 A | §2 B.2, §1 step 3 | – |
| 036 | Preview before live | 4dcc3c0 | §2 A | §2 B.4 preview cookie, §8 `layout.header` | src/slots/PreviewBanner.tsx |
| 037 | Page-builder preview | 4a870c7 | §9 | §9 B.4 | theme.css |
| 038 | Theme widgets | 725939f | §9 A | §9 B.2, §9 B.4 | src/widgets/Testimonials.tsx |
| 039 | Routes in a theme | c16bffc | – | §7 B.5 plugin routes | src/server/shipping.ts |
| 041 | Mobile layout | 71b2786 | §8 | §3 B.1 | src/styles/mobile.css |
| 042 | Update a component | 50fee04 | §8 A.2 search | §8 `header.search` | src/slots/SearchWithPopular.tsx |
| 043 | Override a component | 293acb4 (+ d3164f3 correction) | §5 A.3 | §5 `product.addToCart` | src/slots/CustomizeToOrder.tsx |
| 046 | Two packages, same slot | 3677220 | §8 | §3 slot composition, §8 `layout.header` | spp-commerce.znode-package.json |
| 047 | Order in a slot | c104f25 | §8 | §3 slot composition, §2 B.2 order | spp-promos.znode-package.json |
| 048 | Change the header | beee0c9 | §8 A.2 | §8 `layout.header` + CSS | src/slots/HeaderScrollState.tsx |
| 049 | Change the footer | fb534a7 | §8 A.3 | §8 `layout.footer` | src/slots/FooterHelp.tsx |
| 050 | Change the product card | 5c477da, d3164f3 | §4 A | §4 B.3-B.6 | src/slots/ProductListing.tsx |
| 051 | Added-to-cart popup | 08e3680 | §6 A.4-5 | §6 `addToCart.notification` | src/slots/AddedToCart.tsx |
| 052 | Change the layout code | d38561b | §3 A | §3 B.4 `layout.root` | src/server/ThemeLayout.tsx |
| 053 | Root layout head | ee69375 | §3 A | §3 B.3 `layout.head` | src/slots/HeadTags.tsx |
| 054 | Listing layout | 697e314 | §4 A.7 | §4 B.3-B.5 | ProductListing.tsx |
| 055 | Product page layout | cef2151 (+ d3164f3 correction) | §5 A.3 | §5 `product.addToCart` + CSS | src/slots/ProductFacts.tsx, pdp.css |
| 056 | Cart page layout | 6cbb7af | §7 A.1 | §3 B.1 on cart markup | src/styles/cart.css |
| 057 | Checkout layout | 3032367 | §7 A.3 | §3 B.1 on checkout markup | src/styles/checkout.css |
| 059 | New widget | 597c858 | §9 A | §9 B.2, B.4 | src/widgets/Faq.tsx |
| 060 | Theme or global widget | 6138104 | §9 | §2 B.2 placement, §9 B.4 | spp-widgets.znode-package.json |
| 061 | Plugin carries a widget | cfd385a | §9 | §9 B.4 | src/commerce/widgets/AccountManager.tsx |
| 062 | Widget settings fields | f4953c1 | §9 | §9 B.4 (fields) | src/widgets/PromoBanner.tsx |
| 063 | All field types | 2044865 | §9 | §9 B.4 | PromoBanner.tsx |
| 064 | Default values | b143c5b | §9 | §9 B.4 (defaultProps) | PromoBanner.tsx |
| 065 | Own editor category | 7a139c1 | §9 | §9 B.4 (category) | src/widgets/*.tsx |
| 066 | Live preview while editing | fcb2a57 | §9 | §9 B.4 (preview = same component) | – |
| 067 | Drag a widget and publish (locally) | f1dee89 | §9 A (editor save, blocked) | §9 B.1 package page + §9 B.2 widget | scripts/editor.mjs, src/commerce/pages/home.json |
| 068 | Update an existing widget's config | 1fcbc6a | §9 | §9 B.4 (fields merged), §9 B.2 (render) | src/widgets/PromoCodeStripPlus.tsx |
| 069 | Change a widget's design | 6fb4efd | §9 | §3 B.1 | src/styles/card-grid.css |
| 070 | Replace a widget's render | 67e61f1 | §9 | §9 B.2 (existing type) | src/widgets/DeliveryTimeline.tsx |
| 071 | Hide base widgets in the editor | 68eba69 | §9 | §9 B.4 (`linkRuntimeStyles`) | src/styles/editor.css |
| 072 | Reorder editor categories | 8acf508 | §9 | §9 B.4 (`linkRuntimeStyles`) | editor.css |
| 077 | Widget on one store only | 5dd26e6 | §9 | §2 B.2 placement | – |
| 080 | Before/after add to cart (case packs) | 1052a6b | §6 | §6 B (request hooks), §7 B.5 route | src/commerce/server.ts |
| 081 | React to cart changes (order limit) | 6d7c25f | §7 | §7 B.1 (`runCartHooks`) | src/commerce/server.ts, src/commerce/rules.ts |
| 082 | Change cart lines before they are shown | 3ad302b | §7 A.1 | §7 B.1 (`runMapCartItems`) | src/commerce/server.ts, src/commerce/rules.ts |
| 113 | Add or remove cart items automatically | 68703da | §7 A.1 | §7 B.1 (`runCartHooks` actions) | src/commerce/server.ts, src/commerce/rules.ts |
| 114 | Cart rules (minimum order quantity) | (this commit) | §7 A.1 | §7 B.1 (`runCartHooks`, `runMapCartItems`) | src/commerce/rules.ts, src/commerce/server.ts |

Rows not listed are blocked, outside a theme repository, or not done yet (see `SCENARIOS.md`).
