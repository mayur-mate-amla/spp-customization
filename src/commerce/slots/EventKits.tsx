import { useEffect } from "react";

// The interactive part of /event-kits (row 121). A server page has no browser code of its own, so the plugin's
// layout.header slot (on every page) renders this too; on /event-kits only it:
//   - asks the sku-lookup route (row 095: this store's catalog through context.znode) for every kit line, and fills in
//     names, prices each, line totals and kit totals; a line not found says so and its kit cannot be added
//   - wires each "Add kit to cart": the kit's lines go one by one to the store's own POST /api/add-to-cart, as the
//     product page sends them, so the store's agent and every plugin rule apply (case packs, companions, limits,
//     stock holds, activity); the cart cookies are set as the store's own add to cart sets them; then the cart.
// It renders nothing.

type ILookup = { sku: string; found: boolean; name?: string; price?: number; inStock?: number };

const money = (value: number) => `$${value.toFixed(2)}`;
const cookie = (name: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] || "");
const DEFAULT_CART_ID = "00000000-0000-0000-0000-000000000000";

async function addLine(sku: string, quantity: number) {
  const line = { sku, quantity: String(quantity), productType: "SimpleProduct", addOnSkuListModel: [], personalizedDetails: [], addToCartChildItems: [], customData: [], groupCode: "", additionalCost: [] };
  const response = await fetch("/api/add-to-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId: cookie("CartId") || DEFAULT_CART_ID, skuDetails: [line] }),
  });
  const answer = await response.json().catch(() => null);
  const data = answer?.data || {};
  if (!response.ok || !data.addToCartStatus) throw new Error(data.errorMessage || `Item # ${sku} could not be added.`);
  // as the store's own add to cart does (setCartCookie): the next line goes to the same cart
  if (data.cartId) document.cookie = `CartId=${data.cartId}; Path=/`;
  if (data.cartNumber) document.cookie = `CartNumber=${data.cartNumber}; Path=/`;
}

export function EventKits() {
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, "").toLowerCase() !== "/event-kits") return;
    const lines = [...document.querySelectorAll<HTMLElement>("[data-spp-kit-line]")];
    const skus = [...new Set(lines.map((line) => line.dataset.sku || ""))].filter(Boolean);
    const found = new Map<string, ILookup>();
    let live = true;

    fetch(`/api/extensions/plugins/spp-commerce/sku-lookup?skus=${encodeURIComponent(skus.join(","))}`)
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => {
        if (!live) return;
        for (const item of (data.items || []) as ILookup[]) found.set(item.sku.toUpperCase(), item);
        const totals = new Map<string, number>();
        const missing = new Set<string>();
        for (const line of lines) {
          const kit = line.dataset.sppKitLine || "";
          const item = found.get((line.dataset.sku || "").toUpperCase());
          const quantity = Number(line.dataset.qty) || 0;
          const cell = (name: string) => line.querySelector<HTMLElement>(`[${name}]`);
          if (!item?.found || item.price === undefined) {
            missing.add(kit);
            cell("data-spp-price")!.textContent = "not available";
            continue;
          }
          if (item.name) cell("data-spp-name")!.textContent = item.name;
          cell("data-spp-price")!.textContent = money(item.price);
          cell("data-spp-total")!.textContent = money(item.price * quantity);
          totals.set(kit, (totals.get(kit) || 0) + item.price * quantity);
        }
        document.querySelectorAll<HTMLElement>("[data-spp-kit-total]").forEach((cell) => {
          const kit = cell.dataset.sppKitTotal || "";
          cell.textContent = missing.has(kit) ? "–" : money(totals.get(kit) || 0);
        });
        document.querySelectorAll<HTMLButtonElement>("[data-spp-kit-add]").forEach((button) => {
          button.disabled = missing.has(button.dataset.sppKitAdd || "");
        });
      })
      .catch(() => undefined);

    const onClick = async (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-spp-kit-add]");
      if (!button || button.disabled) return;
      const kit = button.dataset.sppKitAdd || "";
      const status = document.querySelector<HTMLElement>(`[data-spp-kit-status="${kit}"]`);
      const kitLines = lines.filter((line) => line.dataset.sppKitLine === kit);
      button.disabled = true;
      try {
        for (const [index, line] of kitLines.entries()) {
          if (status) status.textContent = `Adding ${index + 1} of ${kitLines.length}...`;
          await addLine(line.dataset.sku || "", Number(line.dataset.qty) || 1);
        }
        if (status) status.textContent = "Kit added. Opening your cart...";
        window.location.href = "/cart";
      } catch (failure) {
        if (status) status.textContent = failure instanceof Error ? failure.message : "The kit could not be added.";
        button.disabled = false;
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      live = false;
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
