import { useEffect, useState } from "react";

// ERP stock holds in the browser (the erp-stock webhook of row 091 sets them on the server): one request per page,
// shared by the product cards (RuleTags) and the product page (DeliveryEstimate's notice). Asked after the page has
// loaded, so the server's and the browser's first render agree.

export type IHold = { sku: string; backOn: string; note: string };

let holdsRequest: Promise<Map<string, IHold>> | null = null;

export function loadHolds() {
  holdsRequest ??= fetch("/api/extensions/plugins/spp-commerce/stock-holds", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { holds: [] }))
    .then((data) => new Map<string, IHold>((Array.isArray(data?.holds) ? data.holds : []).map((hold: IHold) => [hold.sku.toUpperCase(), hold])))
    .catch(() => new Map<string, IHold>());
  return holdsRequest;
}

/** The hold on this SKU, or null (also while loading). */
export function useHold(sku: string) {
  const [hold, setHold] = useState<IHold | null>(null);
  useEffect(() => {
    let live = true;
    if (sku) loadHolds().then((holds) => live && setHold(holds.get(sku.toUpperCase()) || null));
    return () => {
      live = false;
    };
  }, [sku]);
  return hold;
}

/** "Dec 1" for an ISO day, in the shopper's locale. */
export const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
