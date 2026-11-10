import type { ICartHookContext, IPluginRouteContext, IPluginRouteRequest, IRuntimeData, IRuntimeHookContext, IRuntimePlugin } from "znode-plugin/types/extension-api";
import { companionChanges, lineNotes, quantityRule, withNotes } from "./rules";

// spp-commerce, server part (runs on the store's server only).
//   beforeAddToCart  case packs: an item sold in packs (setting casePacks: { "<sku>": <pack size> }) is rounded up to
//                    whole packs before the request goes to Znode (1 lanyard -> a pack of 10)
//   afterAddToCart   order activity: each add (asked, added, cart number, result) is recorded for the store
//   onCartChanged    when the cart is read (cart page, checkout):
//                    - minimums (setting minimums: { "<sku>": <min> }): a line under its minimum is raised to it
//                    - per-order limits (setting orderLimits: { "<sku>": <max> }): a line over its limit is brought to it
//                    - companions (setting companions: { "<sku>": "<companion sku>" }): an ID holder brings its lanyard,
//                      removed again with it
//   mapCartItems     line notes (setting lineNotes): "Sold in cases of 10", "Minimum order 25", "Limit 5 per order"
//                    under the lines they apply to, on the cart page and checkout
//   routes.activity  GET /api/extensions/plugins/spp-commerce/activity: the store's last 20 adds and cart changes
// The add-to-cart request is { cartId, skuDetails: [{ sku, quantity, customData, personalizedDetails, ... }], localeId,
// userId }; the response { cartId, addToCartStatus, cartNumber, cartCount }. onCartChanged gets the cart as
// { cartNumber, lines: [{ id, sku, quantity, totalPrice, personalization }] } and actions addItem / removeLine.

type ISkuLine = { sku?: string; quantity?: string | number };
type IActivity = { at: string; sku: string; asked: number; added: number; rule: string; cartNumber?: string; ok?: boolean };

// per store (module scope is per store on the server); kept in memory: the last 20 adds and cart changes
const activity = new Map<string, IActivity[]>();
// per cart: the companions the companion rule added (companion SKU -> item SKU), so only those are ever removed
const companionsAdded = new Map<string, Record<string, string>>();
// the adds of the request in flight, completed by afterAddToCart
const pending = new Map<string, IActivity[]>();

function record(store: string, entries: IActivity[]) {
  const list = activity.get(store) || [];
  list.push(...entries);
  activity.set(store, list.slice(-20));
}

function skuMap(settings: Record<string, unknown>, key: string) {
  return settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {};
}

function packSize(settings: Record<string, unknown>, sku: string) {
  const packs = skuMap(settings, "casePacks");
  const size = Number(packs[sku] ?? packs[sku.toUpperCase()] ?? 0);
  return Number.isInteger(size) && size > 1 ? size : 0;
}

export function roundToPacks(quantity: number, pack: number) {
  return pack > 1 && quantity > 0 ? Math.ceil(quantity / pack) * pack : quantity;
}

async function beforeAddToCart(request: IRuntimeData, context: IRuntimeHookContext) {
  const details = Array.isArray(request.skuDetails) ? (request.skuDetails as (ISkuLine & { addToCartChildItems?: ISkuLine[] })[]) : [];
  // a variant (configurable product) comes as its parent with the variant, and its quantity, in addToCartChildItems
  const lines = details.flatMap((line) => (Array.isArray(line.addToCartChildItems) && line.addToCartChildItems.length ? line.addToCartChildItems : [line]));
  const adds: IActivity[] = [];
  for (const line of lines) {
    const sku = String(line.sku || "");
    const asked = Number(line.quantity) || 0;
    const pack = packSize(context.settings, sku);
    const added = roundToPacks(asked, pack);
    if (added !== asked) line.quantity = typeof line.quantity === "string" ? String(added) : added;
    adds.push({ at: new Date().toISOString(), sku, asked, added, rule: pack ? `case pack of ${pack}` : "" });
  }
  pending.set(context.store.code, adds);
  return request;
}

async function afterAddToCart(response: IRuntimeData, context: IRuntimeHookContext) {
  const adds = pending.get(context.store.code) || [];
  pending.delete(context.store.code);
  record(
    context.store.code,
    adds.map((add) => ({ ...add, cartNumber: String(response.cartNumber || ""), ok: response.addToCartStatus === true })),
  );
}

// A line under its minimum or over its per-order limit is replaced by one at the minimum / limit (Znode's cart has no
// "set quantity" for a plugin: the line is removed and the item added again with the allowed quantity, its
// personalization kept).
async function onCartChanged({ store, cart, settings, actions }: ICartHookContext) {
  const limits = skuMap(settings, "orderLimits");
  const minimums = skuMap(settings, "minimums");
  for (const line of cart.lines) {
    const fix = quantityRule(line.sku, line.quantity, minimums, limits);
    if (!fix) continue;
    const removed = await actions.removeLine(line.id);
    const added = removed && (await actions.addItem({ sku: line.sku, quantity: fix.quantity, personalization: line.personalization }));
    record(store.code, [{ at: new Date().toISOString(), sku: line.sku, asked: line.quantity, added: fix.quantity, rule: fix.rule, cartNumber: cart.cartNumber, ok: Boolean(added) }]);
  }

  // companions: added with their item, removed with it (only the ones this rule added)
  const added = companionsAdded.get(cart.cartNumber) || {};
  for (const change of companionChanges(cart.lines, skuMap(settings, "companions"), added, skuMap(settings, "casePacks"))) {
    const at = new Date().toISOString();
    if (change.add) {
      const ok = await actions.addItem({ sku: change.add.sku, quantity: change.add.quantity });
      if (ok) added[change.add.sku] = change.add.for;
      record(store.code, [{ at, sku: change.add.sku, asked: 0, added: change.add.quantity, rule: `companion of ${change.add.for}`, cartNumber: cart.cartNumber, ok }]);
    }
    if (change.remove) {
      const ok = await actions.removeLine(change.remove.lineId);
      if (ok) delete added[change.remove.sku];
      record(store.code, [{ at, sku: change.remove.sku, asked: 0, added: 0, rule: `companion removed with ${change.remove.for}`, cartNumber: cart.cartNumber, ok }]);
    }
  }
  if (Object.keys(added).length) companionsAdded.set(cart.cartNumber, added);
  else companionsAdded.delete(cart.cartNumber);
}

// The cart's lines before the cart page or checkout shows them: { cartNumber, cartItems: [{ sku, productName,
// productDescription (HTML), quantity, unitPrice, ... }] }. The notes go after Znode's description, which the cart
// renders as HTML; the object is returned changed.
async function mapCartItems(cart: IRuntimeData, { settings }: IRuntimeHookContext) {
  if (settings.lineNotes === false || !Array.isArray(cart.cartItems)) return cart;
  const casePacks = skuMap(settings, "casePacks");
  const limits = skuMap(settings, "orderLimits");
  const minimums = skuMap(settings, "minimums");
  const cartItems = (cart.cartItems as IRuntimeData[]).map((item) => {
    const notes = lineNotes(String(item.sku || ""), casePacks, limits, minimums);
    return notes.length ? { ...item, productDescription: withNotes(item.productDescription, notes) } : item;
  });
  return { ...cart, cartItems };
}

const plugin: IRuntimePlugin = {
  name: "spp-commerce",
  apiVersion: 1,
  hooks: { beforeAddToCart, afterAddToCart, onCartChanged, mapCartItems },
  routes: {
    activity: async (_request: IPluginRouteRequest, context: IPluginRouteContext) => ({ store: context.store.code, adds: activity.get(context.store.code) || [] }),
  },
};

export default plugin;
