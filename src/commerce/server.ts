import type { IPluginRouteContext, IPluginRouteRequest, IRuntimeData, IRuntimeHookContext, IRuntimePlugin } from "znode-plugin/types/extension-api";

// spp-commerce, server part (runs on the store's server only).
//   beforeAddToCart  case packs: an item sold in packs (setting casePacks: { "<sku>": <pack size> }) is rounded up to
//                    whole packs before the request goes to Znode (1 lanyard -> a pack of 10)
//   afterAddToCart   order activity: each add (asked, added, cart number, result) is recorded for the store
//   routes.activity  GET /api/extensions/plugins/spp-commerce/activity: the store's last 20 adds
// The add-to-cart request is { cartId, skuDetails: [{ sku, quantity, customData, personalizedDetails, ... }], localeId,
// userId }; the response { cartId, addToCartStatus, cartNumber, cartCount }.

type ISkuLine = { sku?: string; quantity?: string | number };
type IActivity = { at: string; sku: string; asked: number; added: number; rule: string; cartNumber?: string; ok?: boolean };

// per store (module scope is per store on the server); kept in memory: the last 20 adds
const activity = new Map<string, IActivity[]>();
// the adds of the request in flight, completed by afterAddToCart
const pending = new Map<string, IActivity[]>();

function packSize(settings: Record<string, unknown>, sku: string) {
  const packs = settings.casePacks && typeof settings.casePacks === "object" ? (settings.casePacks as Record<string, unknown>) : {};
  const size = Number(packs[sku] ?? packs[sku.toUpperCase()] ?? 0);
  return Number.isInteger(size) && size > 1 ? size : 0;
}

export function roundToPacks(quantity: number, pack: number) {
  return pack > 1 && quantity > 0 ? Math.ceil(quantity / pack) * pack : quantity;
}

async function beforeAddToCart(request: IRuntimeData, context: IRuntimeHookContext) {
  const lines = Array.isArray(request.skuDetails) ? (request.skuDetails as ISkuLine[]) : [];
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
  const list = activity.get(context.store.code) || [];
  for (const add of adds) list.push({ ...add, cartNumber: String(response.cartNumber || ""), ok: response.addToCartStatus === true });
  activity.set(context.store.code, list.slice(-20));
}

const plugin: IRuntimePlugin = {
  name: "spp-commerce",
  apiVersion: 1,
  hooks: { beforeAddToCart, afterAddToCart },
  routes: {
    activity: async (_request: IPluginRouteRequest, context: IPluginRouteContext) => ({ store: context.store.code, adds: activity.get(context.store.code) || [] }),
  },
};

export default plugin;
