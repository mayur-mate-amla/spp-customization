# 043: Can I override an existing component with a runtime package?

**Listed:** Partial. **Result here:** Yes for every component the store wraps with a slot (`withRuntimeWrapper`); a
component with no slot needs one added in the webstore, which is what keeps the list's answer at Partial. (Corrected:
an earlier version of this page said `product.image` and the listing card were not wrapped on this store; see below.)

| Before (the store's add-to-cart) | After: decorated product | After: other products unchanged |
| --- | --- | --- |
| ![before](before.png) | ![after](after.png) | ![other product](other-product.png) |

Store: POCSppDemo (`sppdemo.localhost:3000`), product pages, theme previewed.

## The example: "Customize & order" for decorated products

Branded merchandise is ordered after the buyer adds a logo, so for those products the store's quantity box and
add-to-cart button make no sense. For the SKUs in the **`customizableSkus`** setting the theme **replaces** the
store's add-to-cart component with:

1. Add your logo or text · 2. Approve a free digital proof · 3. Order — and a **Customize & order** button that opens
the store's customizer with this product (`/customizer?productCode=80RXL_986`).

The store's component is not rendered at all for those products (an override, not a wrapper). Every other product
keeps the store's own quantity box and "Add to order" button (3/4" Poly Lanyard, right).

## Which components can be overridden here

Checked on this store's product and listing pages (temporary probes, removed before the commit), and against the
store code (`docs/RENDER-FLOW.md`):

| Slot | On POCSppDemo |
| --- | --- |
| `product.addToCart`, `product.layout` | runs |
| `product.card` (listing) | runs: the listing's `common/product-card` is wrapped (`ProductCard.tsx:169`); all 12 Best Sellers cards carry the theme's wrapper when the store's own listing shows (re-checked with the theme's listing cards off, 050) |
| `product.image` | runs, but the **artifi plugin** fills the same slot after the theme and, for products with an Artifi image, replaces what it gets (`artifi/src/slots/product-image.tsx`), so the theme's output does not show there |

Correction: the first version of this page said `product.image` and the listing card were not wrapped on this store.
The listing probe ran while the cards were still loading, and the image probe's output was replaced by artifi. Order
matters: a slot's later package (plugins come after the theme) decides what is finally shown.


## How it renders

**In the webstore (base):** `product/[id]/page.tsx` → agent `getProductInformation` → `GET {API_URL}v2/published-products/{id}` → `ProductDetailsPage` → `ProductBasicInfo` (image, name, price, variants, `AddToCart`) ([§5 A](../../RENDER-FLOW.md#5-product-details-page))

**How this customization joins it:** `AddToCart.tsx` → `RuntimeAddToCart` → `<RuntimeSlot name="product.addToCart">`: `CustomizeToOrder` returns the store's `children` or, for listed SKUs, its own element instead ([§5 B](../../RENDER-FLOW.md#5-product-details-page)); slot order decides what wins (artifi after the theme, [§3](../../RENDER-FLOW.md#3-the-page-shell-root-layout-head-styles-labels-server-layout))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

- `src/slots/CustomizeToOrder.tsx` (new): the `product.addToCart` slot; returns the store's `children` unless the SKU
  is listed
- `src/browser.tsx`: `"product.addToCart": CustomizeToOrder`
- `znode-package.json`: setting `customizableSkus` (list, empty by default)
- `src/styles/theme.css`: `.spp-customization-customize*`

Set for the screenshots: `node scripts/registry.mjs set 'customizableSkus=["80RXL_986"]'`.

## How a client does this

In the slot component, return your own element instead of `props.children` (for all products, or under a condition).
