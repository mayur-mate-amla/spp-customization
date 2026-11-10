import { caseQuantity, pinFirst } from "./rules.js";
import { settings } from "./host.js";

// spp-commerce's data transforms: they change the data a part of the page gets, not how it looks.
//   productList.data            category and search listings: the store's promoted SKUs (setting pinnedSkus) first,
//                               the rest in the store's order; the listing, its count and its sort bar are unchanged
//   addToCart.notificationData  the added-to-cart popup: the quantity the cart really got (a case pack rounds 1 up to
//                               10, row 080), not the quantity typed; the popup's own design is unchanged

type IListing = { productList?: { sku?: string }[] } & Record<string, unknown>;
type IPopup = { sku?: string; quantity?: number | string } & Record<string, unknown>;

const map = (key: string) => (settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {});

export function pinPromoted(data: IListing) {
  const pinned = Array.isArray(settings.pinnedSkus) ? settings.pinnedSkus : [];
  if (!pinned.length || !Array.isArray(data?.productList)) return data;
  return { ...data, productList: pinFirst(data.productList, pinned) };
}

export function popupQuantity(data: IPopup | null) {
  if (!data || !data.sku) return data;
  const asked = Number(data.quantity) || 0;
  const added = caseQuantity(String(data.sku), asked, map("casePacks"));
  return added === asked ? data : { ...data, quantity: typeof data.quantity === "string" ? String(added) : added };
}
