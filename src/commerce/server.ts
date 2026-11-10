import type { ICartHookContext, IPluginRouteContext, IPluginRouteRequest, IRuntimeData, IRuntimeHookContext, IRuntimePlugin } from "znode-plugin/types/extension-api";
import { companionChanges, lineNotes, quantityRule, replacedBy, withNotes } from "./rules";
import { OrderingInfoPage } from "./OrderingInfoPage";
import { arrivalDate, lookupZip, transitDays, type IPlace } from "./delivery";
import { envelope, readQuoteRequest, type IQuoteRequest } from "./quotes";

// spp-commerce, server part (runs on the store's server only).
//   beforeAddToCart  superseded item numbers go to their current item (setting replacedSkus, row 106); case packs: an item sold in packs (setting casePacks: { "<sku>": <pack size> }) is rounded up to
//                    whole packs before the request goes to Znode (1 lanyard -> a pack of 10)
//   afterAddToCart   order activity: each add (asked, added, cart number, result) is recorded for the store
//   onCartChanged    when the cart is read (cart page, checkout):
//                    - minimums (setting minimums: { "<sku>": <min> }): a line under its minimum is raised to it
//                    - per-order limits (setting orderLimits: { "<sku>": <max> }): a line over its limit is brought to it
//                    - companions (setting companions: { "<sku>": "<companion sku>" }): an ID holder brings its lanyard,
//                      removed again with it
//   mapCartItems     line notes (setting lineNotes): "Sold in cases of 10", "Minimum order 25", "Limit 5 per order"
//                    under the lines they apply to, on the cart page and checkout
//   serverPages      /ordering-information: the ordering policies, written from these settings (OrderingInfoPage.tsx)
//   routes.activity  GET /api/extensions/plugins/spp-commerce/activity: the store's last 20 adds and cart changes
//   routes.rep       GET .../rep?code=JR&to=/category/1674: a sales rep's link. Sets the spp_rep cookie (30 days) for a
//                    known rep (setting salesReps) and redirects; the account bar names the rep, adds are credited
//   routes.erp-stock POST, a signed webhook from the ERP: stock holds ("out until Dec 1"); routes.stock-holds lists them
//   routes.delivery-estimate  GET ?zip=: the delivery date to a ZIP (city and state from a public ZIP API, server side)
//   overrides        /api/search/search-hydrated-typeahead -> search-typeahead: synonyms and a sourcing link (row 098)
//   overrides        /api/add-to-cart -> add-to-cart: items on an ERP stock hold are refused, the rest is the store's (row 109)
//   overrides        /api/contact-us -> quote-request: replaced, a quote request for the shopper's rep (row 099)
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
  const replacements = skuMap(context.settings, "replacedSkus");
  for (const line of lines) {
    // superseded item numbers (setting replacedSkus: { "<old sku>": "<current sku>" }, row 106): the add goes to the
    // current item, before the case-pack rule, so the current item's pack applies
    const rules: string[] = [];
    const replacement = replacedBy(String(line.sku || ""), replacements);
    if (replacement) {
      rules.push(`replaces ${line.sku}`);
      line.sku = replacement;
    }
    const sku = String(line.sku || "");
    const asked = Number(line.quantity) || 0;
    const pack = packSize(context.settings, sku);
    const added = roundToPacks(asked, pack);
    if (added !== asked) line.quantity = typeof line.quantity === "string" ? String(added) : added;
    if (pack) rules.push(`case pack of ${pack}`);
    adds.push({ at: new Date().toISOString(), sku, asked, added, rule: rules.join(", "), ...(rep ? { rep } : {}) });
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

// ---- ERP stock holds: a webhook ---------------------------------------------------------------------------------
// The ERP posts when an item goes on hold or comes back:
//   POST /api/extensions/plugins/spp-commerce/erp-stock
//   X-Erp-Signature: sha256=<hex HMAC-SHA256 of the body with the erpWebhookSecret setting>
//   { "sku": "817NK_25", "available": false, "backOn": "2026-12-01", "note": "Restocking" }   (available: true clears it)
// Only a correctly signed body is taken (verifySignature: constant time, on the body exactly as sent); anything else is
// 401. The holds are kept in memory per store (a plugin has no database, row 087): the ERP sends them again after a
// restart. GET .../stock-holds lists them for the product cards.
type IStockHold = { sku: string; backOn: string; note: string; at: string };
const stockHolds = new Map<string, Map<string, IStockHold>>();

export function readStockEvent(body: unknown): { sku: string; available: boolean; backOn: string; note: string } | null {
  if (!body || typeof body !== "object") return null;
  const event = body as Record<string, unknown>;
  const sku = typeof event.sku === "string" ? event.sku.trim().toUpperCase() : "";
  if (!/^[A-Z0-9_.-]{1,40}$/.test(sku) || typeof event.available !== "boolean") return null;
  const backOn = typeof event.backOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.backOn) ? event.backOn : "";
  const note = typeof event.note === "string" ? event.note.slice(0, 80) : "";
  return { sku, available: event.available, backOn, note };
}

async function erpStock(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (request.method !== "POST") return json(405, { error: "POST only" });
  const secret = String(context.settings.erpWebhookSecret || "");
  if (!context.verifySignature(request.rawBody, request.headers["x-erp-signature"], secret, { prefix: "sha256=" })) return json(401, { error: "Bad signature" });
  const event = readStockEvent(request.body);
  if (!event) return json(400, { error: "Expected { sku, available, backOn?, note? }" });
  const holds = stockHolds.get(context.store.code) || new Map<string, IStockHold>();
  if (event.available) holds.delete(event.sku);
  else holds.set(event.sku, { sku: event.sku, backOn: event.backOn, note: event.note, at: new Date().toISOString() });
  stockHolds.set(context.store.code, holds);
  return json(200, { ok: true, sku: event.sku, onHold: !event.available, holds: holds.size });
}

// ---- Add to cart: an inventory check before the store's agent (row 109) -------------------------------------------
// "overrides": { "/api/add-to-cart": "add-to-cart" }. A hook cannot refuse an add (row 106), so the plugin takes over the
// store's add-to-cart route: a line whose item is on an ERP stock hold (the erp-stock webhook, row 091; superseded
// numbers resolved first, row 106) is refused in the store's envelope (addToCartStatus false, so the store's own UI says
// the add failed; the product page's notice says why); anything else is the store's route, called with
// context.original(): its hooks (case packs, activity) and its agent run as before.
type IAddLine = { sku?: string; addToCartChildItems?: { sku?: string }[] };

export function heldLines(body: unknown, holds: Map<string, IStockHold> | undefined, replacements: Record<string, unknown>) {
  const details = body && typeof body === "object" && Array.isArray((body as { skuDetails?: unknown }).skuDetails) ? ((body as { skuDetails: IAddLine[] }).skuDetails) : [];
  const skus = details.flatMap((line) => (Array.isArray(line.addToCartChildItems) && line.addToCartChildItems.length ? line.addToCartChildItems : [line])).map((line) => String(line.sku || ""));
  return skus.flatMap((sku) => {
    const current = (replacedBy(sku, replacements) || sku).toUpperCase();
    const hold = holds?.get(current);
    return hold ? [hold] : [];
  });
}

async function addToCartGuard(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  const held = heldLines(request.body, stockHolds.get(context.store.code), skuMap(context.settings, "replacedSkus"));
  if (held.length) {
    const first = held[0];
    record(context.store.code, held.map((hold) => ({ at: new Date().toISOString(), sku: hold.sku, asked: 0, added: 0, rule: `refused: on hold${hold.backOn ? ` until ${hold.backOn}` : ""}`, ok: false })));
    const message = `Item # ${first.sku} is on hold${first.backOn ? ` until ${first.backOn}` : ""} and cannot be ordered right now.`;
    return json(200, envelope({ addToCartStatus: false, isSuccess: false, cartCount: 0, errorMessage: message, onHold: held.map(({ sku, backOn }) => ({ sku, backOn })) }, message));
  }
  // the store's own route, with the shopper's cookies. The body must be passed: original() with no body sends none
  // (found here: the store's route then fails with "Unexpected end of JSON input")
  const answer = await context.original({ body: request.body });
  return json(answer.status, answer.data);
}

// ---- Contact us: a store route replaced (row 099) ------------------------------------------------------------------
// "overrides": { "/api/contact-us": "quote-request" }: the store's route is never called (no context.original()). The
// request is checked, given a reference and the shopper's rep, and kept for the staff route; the answer is the store's
// envelope. GET .../quote-requests lists them for staff, with the X-Staff-Key header equal to the server-only staffKey
// setting (empty: the list is closed): they hold shoppers' names and emails.
const quoteRequests = new Map<string, IQuoteRequest[]>();

// a key compared in constant time; an empty configured key never matches
function sameSecret(given: string, key: string) {
  if (!key || given.length !== key.length) return false;
  let diff = 0;
  for (let index = 0; index < key.length; index++) diff |= given.charCodeAt(index) ^ key.charCodeAt(index);
  return diff === 0;
}

async function quoteRequest(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (request.method !== "POST") return json(405, { error: "POST only" });
  const reps = context.settings.salesReps && typeof context.settings.salesReps === "object" ? (context.settings.salesReps as Record<string, unknown>) : {};
  const { request: quote, error } = readQuoteRequest(request.body, reps);
  if (!quote) return json(200, envelope({ hasError: true, errorMessage: error }));
  const list = quoteRequests.get(context.store.code) || [];
  list.push(quote);
  quoteRequests.set(context.store.code, list.slice(-50));
  return json(200, envelope({ hasError: false, errorMessage: "", reference: quote.reference, rep: quote.rep }, `Quote request ${quote.reference} sent to ${quote.rep}`));
}

async function quoteRequestList(request: IPluginRouteRequest, context: IPluginRouteContext) {
  if (!sameSecret(request.headers["x-staff-key"] || "", String(context.settings.staffKey || ""))) {
    return new Response(JSON.stringify({ error: "Staff only" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  return { store: context.store.code, requests: quoteRequests.get(context.store.code) || [] };
}

// ---- Search typeahead: a store route wrapped (row 098) -------------------------------------------------------------
// "overrides": { "/api/search/search-hydrated-typeahead": "search-typeahead" }: for the stores this plugin runs on, the
// proxy sends the header search's typeahead here. The route asks the store's own route (context.original(): the same
// request, the shopper's cookies) and changes its answer:
//   - a trade word the catalog does not use (setting searchSynonyms: "koozie" -> "can cooler") gets a first entry
//     "Search "can cooler" instead", linking to that search
//   - a search with no product and no category gets "Can't find "x"? Ask us to source it" (the custom-order page)
// The entries go first in both the product and the category list (a theme's search may show either); everything else
// in the answer is the store's, unchanged. If the store's route fails, its answer goes back as it is.
type ITypeaheadEntry = { categoryId: number; categoryName: string; imagePath: string; seoUrl: string; link: string; type: string };

export function typeaheadExtras(term: string, data: { hydratedSearchProductList?: unknown[]; hydratedSearchCategoryList?: ITypeaheadEntry[]; totalProductCount?: number }, synonyms: Record<string, unknown>, sourcingLink: string) {
  const key = term.trim().toLowerCase();
  const extras: ITypeaheadEntry[] = [];
  const synonym = typeof synonyms[key] === "string" ? String(synonyms[key]) : "";
  if (synonym) extras.push({ categoryId: -1, categoryName: `Search "${synonym}" instead`, imagePath: "", seoUrl: "", link: `/search?searchTerm=${encodeURIComponent(synonym)}`, type: "Category" });
  const empty = !(data.hydratedSearchProductList || []).length && !(data.hydratedSearchCategoryList || []).length;
  if (empty && key.length >= 3) extras.push({ categoryId: -2, categoryName: `Can't find "${term.trim()}"? Ask us to source it`, imagePath: "", seoUrl: "", link: sourcingLink, type: "Category" });
  return extras;
}

async function searchTypeahead(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const answer = await context.original();
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  const envelope = answer.data as { data?: Record<string, unknown> } | null;
  if (answer.status !== 200 || !envelope?.data) return json(answer.status, answer.data);
  const synonyms = context.settings.searchSynonyms && typeof context.settings.searchSynonyms === "object" ? (context.settings.searchSynonyms as Record<string, unknown>) : {};
  const extras = typeaheadExtras(String(request.query.searchTerm || ""), envelope.data, synonyms, String(context.settings.sourcingLink || "/contact-us"));
  if (!extras.length) return json(200, envelope);
  const categories = (envelope.data.hydratedSearchCategoryList || []) as ITypeaheadEntry[];
  const products = (envelope.data.hydratedSearchProductList || []) as Record<string, unknown>[];
  // in both lists: a theme's search may show only products (spp-base links an entry to /<seoUrl>) or also categories
  const asProducts = extras.map((extra) => ({ productId: extra.categoryId, productName: extra.categoryName, imagePath: "", seoUrl: extra.link.replace(/^\//, "") }));
  return json(200, { ...envelope, data: { ...envelope.data, hydratedSearchProductList: [...asProducts, ...products], hydratedSearchCategoryList: [...extras, ...categories] } });
}

// ---- SKU lookup: the Znode API with the store's headers (row 095) ------------------------------------------------
// GET .../sku-lookup?skus=81DRL,817NK_25 -> { items: [{ sku, found, name, price, inStock, url }] }, at most 20 SKUs.
// context.znode(path) fetches {API_URL}<path> with the headers the store's own agents send (its API key, portal,
// locale, catalog, the shopper's profile), so the answer is this store's catalog and prices, as on its pages. The path
// is the one the store's agent uses for a SKU (PublishProducts_skuByProductSKU).
type ISkuItem = { sku: string; found: boolean; name?: string; price?: number; inStock?: number; url?: string };

// the store's catalog and locale codes, which the SKU call needs: from Znode's portal call (the one the store's
// getPortalDetails makes, v2/portals/<store>/application/2 = web store), once per store
const portalCodes = new Map<string, { catalog: string; locale: string }>();
async function storeCodes(context: IPluginRouteContext) {
  const known = portalCodes.get(context.store.code);
  if (known) return known;
  const answer = await context.znode(`v2/portals/${encodeURIComponent(context.store.code)}/application/2`);
  const data = (answer.data || {}) as Record<string, unknown>;
  const portal = (data.WebStorePortal ?? data.webStorePortal ?? data) as Record<string, unknown>;
  const locales = (portal.PortalLocales ?? []) as { LocaleCode?: string; IsDefault?: boolean }[];
  const codes = {
    catalog: String(portal.CatalogCode ?? portal.catalogCode ?? ""),
    locale: String(portal.LocaleCode ?? locales.find((locale) => locale.IsDefault)?.LocaleCode ?? locales[0]?.LocaleCode ?? "en-US"),
  };
  if (codes.catalog) portalCodes.set(context.store.code, codes);
  return codes;
}

async function lookupSku(context: IPluginRouteContext, sku: string): Promise<ISkuItem> {
  const { catalog, locale } = await storeCodes(context);
  const query = new URLSearchParams({ expand: "Pricing,Inventory,Seo", ParentProductId: "0", ParentProductSKU: sku, CatalogCode: catalog, LocaleCode: locale, StoreCode: context.store.code });
  const answer = await context.znode(`v2/published-products/sku/${encodeURIComponent(sku)}?${query}`);
  const data = (answer.data || {}) as Record<string, unknown>;
  const product = (data.PublishProduct ?? data.publishProduct ?? data) as Record<string, unknown>;
  const id = Number(product.PublishProductId ?? product.publishProductId);
  if (answer.status !== 200 || !id) return { sku, found: false };
  const price = Number(product.SalesPrice ?? product.salesPrice) || Number(product.RetailPrice ?? product.retailPrice) || undefined;
  const inventory = (product.Inventory ?? product.inventory) as Record<string, unknown>[] | undefined;
  const quantity = Number(product.Quantity ?? product.quantity ?? (Array.isArray(inventory) ? inventory.reduce((sum, row) => sum + (Number(row.Quantity ?? row.quantity) || 0), 0) : NaN));
  return { sku, found: true, name: String(product.Name ?? product.name ?? ""), price, inStock: Number.isFinite(quantity) ? quantity : undefined, url: `/product/${id}` };
}

async function skuLookup(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const skus = [...new Set(String(request.query.skus || "").split(",").map((sku) => sku.trim().toUpperCase()).filter((sku) => /^[A-Z0-9_.-]{1,40}$/.test(sku)))].slice(0, 20);
  if (!skus.length) return new Response(JSON.stringify({ error: "skus: item numbers, comma separated" }), { status: 400, headers: { "Content-Type": "application/json" } });
  return { store: context.store.code, items: await Promise.all(skus.map((sku) => lookupSku(context, sku))) };
}

// ---- Delivery estimate: a BFF route over an outside API (row 093) -------------------------------------------------
// GET .../delivery-estimate?zip=53202 -> { zip, city, state, transitDays, shipsOn, arrivesBy }; 400 for a ZIP that is
// not five digits, 404 for one that does not exist, 502 when the ZIP API cannot be reached. The browser never calls
// the ZIP API itself: the route chooses what goes out (the ZIP only) and what comes back.
async function deliveryEstimate(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  const zip = String(request.query.zip || "").trim();
  if (!/^\d{5}$/.test(zip)) return json(400, { error: "A 5-digit US ZIP code" });
  let place: IPlace | null;
  try {
    place = await lookupZip(zip);
  } catch {
    return json(502, { error: "Delivery dates are not available right now" });
  }
  if (!place) return json(404, { error: "Unknown ZIP code" });
  const days = transitDays(place);
  const cutoff = Number(context.settings.shipCutoffHour) || 14;
  return { zip, city: place.city, state: place.state, transitDays: days, ...arrivalDate(new Date(), days, cutoff) };
}

const plugin: IRuntimePlugin = {
  name: "spp-commerce",
  apiVersion: 1,
  hooks: { beforeAddToCart, afterAddToCart, onCartChanged, mapCartItems },
  serverPages: {
    "/ordering-information": {
      // this file is .ts (no JSX): the page element is made with the store's React from the context
      render: (_props, context) => context.React.createElement(OrderingInfoPage, { settings: context.settings, storeCode: context.store.code }),
      metadata: { title: "Ordering information", description: "Case packs, minimums, order limits, free shipping and sales reps." },
    },
  },
  routes: {
    activity: async (_request: IPluginRouteRequest, context: IPluginRouteContext) => ({ store: context.store.code, adds: activity.get(context.store.code) || [] }),
    "my-order": myOrder,
    rep: repRoute,
    "erp-stock": erpStock,
    "delivery-estimate": deliveryEstimate,
    "sku-lookup": skuLookup,
    "search-typeahead": searchTypeahead,
    "quote-request": quoteRequest,
    "add-to-cart": addToCartGuard,
    "quote-requests": quoteRequestList,
    "stock-holds": async (_request: IPluginRouteRequest, context: IPluginRouteContext) => ({ holds: [...(stockHolds.get(context.store.code)?.values() || [])] }),
  },
};

export default plugin;
