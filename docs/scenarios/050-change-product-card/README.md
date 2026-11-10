# 050: Can I change the product card?

**Listed:** Yes. **Result here:** Yes, confirmed, with the theme's own card on this store's listing.

| Before (the store's card) | After (the theme's card, one hovered) | After, phone |
| --- | --- | --- |
| ![before](before.png) | ![after](after.png) | ![phone](after-phone.png) |

Store: POCSppDemo (`sppdemo.localhost:3000`), Best Sellers, theme previewed.

## The example: a B2B promotional-products card

Promo-product stores sell blanks that get the buyer's logo, so the card says so. The theme's card shows:

- a **"Your logo here"** image placeholder with the product's initials when the product has no listing image (this
  store's listing images are empty: they come from Artifi on the product page only), or the image when there is one
- name, **Item #**, price **"each"**, a stock pill ("100 ready to ship" / out of stock in red)
- **View details**, and **Customize** (opens the customizer) for the SKUs in `customizableSkus` (043)
- a hover / keyboard-focus lift with the accent border; 2 columns on phones, 3 on tablets, 4 on desktop

## How, on this store

The listing card on this built-in theme (`custom1`) has no `product.card` slot (probed in 043). So the theme takes the
**listing** slot (`productList.layout`), which receives the page's products, and draws the grid with its own card. The
store's sort / count / view bar and filter chips are kept as **parts** (`part("productList.filter")`,
`part("productList.facets")`): the store's own components, logic intact. When a listing has more than one page, the
store's listing is kept (the paging is not a part), so no product is ever hidden. Setting `themeCards: false` turns
the theme's card off.

(The `product.card` slot itself still carries the New badge, `ProductBadge.tsx`, on stores whose card has the slot.)

## Where

- `src/slots/ProductListing.tsx` (new): `ProductCard` and the `productList.layout` slot
- `src/browser.tsx`: `"productList.layout": ProductListing`
- `znode-package.json`: setting `themeCards` (default on)
- `src/styles/product-card.css` (new)

`npm run check`: 0 errors, 1 warning, "reads cookies in the browser", from the preview bar (036) reading the
preview cookie; no secret is kept in a cookie.
