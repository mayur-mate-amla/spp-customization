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
//   routes.rep       GET .../rep?code=JR&to=/category/1674: a sales rep's link. Sets the spp_rep cookie (30 days) for a
//                    known rep (setting salesReps) and redirects; the account bar names the rep, adds are credited
//   routes.my-order  GET /api/extensions/plugins/spp-commerce/my-order: the shopper's own cart (context.cartNumber, its
//                    lines read from Znode with context.znode) and user (context.user): subtotal, the free-shipping
//                    gap and, for a signed-in buyer, their name and budget; for the account bar
// The add-to-cart request is { cartId, skuDetails: [{ sku, quantity, customData, personalizedDetails, ... }], localeId,
// userId }; the response { cartId, addToCartStatus, cartNumber, cartCount }. onCartChanged gets the cart as
// { cartNumber, lines: [{ id, sku, quantity, totalPrice, personalization }] } and actions addItem / removeLine.

type ISkuLine = { sku?: string; quantity?: string | number };
type IActivity = { at: string; sku: string; asked: number; added: number; rule: string; cartNumber?: string; ok?: boolean; rep?: string };

// the sales rep a shopper came through (routes.rep sets it from the rep's link; the browser and the cart hooks read it)
const REP_COOKIE = "spp_rep";
const REP_DAYS = 30;

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
  // hooks get the shopper's cookies (routes do not): the rep this add is credited to
  const rep = context.cookies.get(REP_COOKIE) || undefined;
  for (const line of lines) {
    const sku = String(line.sku || "");
    const asked = Number(line.quantity) || 0;
    const pack = packSize(context.settings, sku);
    const added = roundToPacks(asked, pack);
    if (added !== asked) line.quantity = typeof line.quantity === "string" ? String(added) : added;
    adds.push({ at: new Date().toISOString(), sku, asked, added, rule: pack ? `case pack of ${pack}` : "", ...(rep ? { rep } : {}) });
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

// The shopper's cart and user, from the route's context: the cart number comes from the shopper's cart cookie and the
// user from their session, so a shopper only ever sees their own. The lines are read from Znode with the store's
// headers (context.znode, permission znodeApi): the same call the cart page's agent makes.
type IZnodeLine = Record<string, unknown>;
const pick = (line: IZnodeLine, ...keys: string[]) => {
  for (const key of keys) if (line[key] !== undefined && line[key] !== null) return line[key];
  return undefined;
};

async function myOrder(_request: IPluginRouteRequest, context: IPluginRouteContext) {
  const freeOver = Number(context.settings.freeShippingOver) || 0;
  const user = context.user ? { name: context.user.userName, budget: context.user.budgetAmount || 0, account: context.user.accountCode || "" } : null;
  let lines: IZnodeLine[] = [];
  if (context.cartNumber) {
    const answer = await context.znode(`commerceapi/v1/Carts/item-list/${encodeURIComponent(context.cartNumber)}`);
    const data = (answer.data || {}) as Record<string, unknown>;
    const list = data.ItemList ?? data.itemList;
    lines = answer.status === 200 && Array.isArray(list) ? (list as IZnodeLine[]) : [];
  }
  const items = lines.reduce((sum, line) => sum + (Number(pick(line, "Quantity", "quantity")) || 0), 0);
  const subtotal = Math.round(lines.reduce((sum, line) => sum + (Number(pick(line, "ExtendedPrice", "extendedPrice", "TotalPrice", "totalPrice")) || 0), 0) * 100) / 100;
  return {
    cartNumber: context.cartNumber || null,
    lines: lines.length,
    items,
    subtotal,
    freeShippingOver: freeOver,
    remaining: freeOver ? Math.max(0, Math.round((freeOver - subtotal) * 100) / 100) : 0,
    user,
  };
}

// A rep's link (in their emails and quotes): remember the rep for 30 days and go on to the page. A route answers with a
// Response to set headers: here Set-Cookie and a redirect. Only a known rep code is kept, and only a path on this store
// is followed (no open redirect).
export function repRedirect(code: string, to: string, reps: Record<string, unknown>) {
  const rep = code.trim().toUpperCase();
  const target = /^\/(?!\/)[^\s\\]*$/.test(to) ? to : "/";
  const headers = new Headers({ Location: target });
  if (typeof reps[rep] === "string") headers.append("Set-Cookie", `${REP_COOKIE}=${encodeURIComponent(rep)}; Path=/; Max-Age=${REP_DAYS * 86400}; SameSite=Lax`);
  return { status: 302, headers };
}

async function repRoute(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const reps = context.settings.salesReps && typeof context.settings.salesReps === "object" ? (context.settings.salesReps as Record<string, unknown>) : {};
  const { status, headers } = repRedirect(String(request.query.code || ""), String(request.query.to || "/"), reps);
  return new Response(null, { status, headers });
}

const plugin: IRuntimePlugin = {
  name: "spp-commerce",
  apiVersion: 1,
  hooks: { beforeAddToCart, afterAddToCart, onCartChanged, mapCartItems },
  routes: {
    activity: async (_request: IPluginRouteRequest, context: IPluginRouteContext) => ({ store: context.store.code, adds: activity.get(context.store.code) || [] }),
    "my-order": myOrder,
    rep: repRoute,
  },
};

export default plugin;
