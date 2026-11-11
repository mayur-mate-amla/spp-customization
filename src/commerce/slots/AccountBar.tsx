import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSppTranslations } from "../i18n.js";
import { host, settings } from "../host.js";

// Slot layout.header (spp-commerce): a thin B2B account bar above everything else in the header: who is signed in and
// that their account pricing applies (with their budget, when the account sets one), or a sign-in prompt for guests,
// and the order so far with a free-shipping meter ("$57.50 in your order · add $42.50 for free shipping"), as B2B
// storefronts show. The order and the user are read on the server by the plugin's my-order route (the shopper's own
// cart and session); the bar asks again whenever the cart's item count or the sign-in changes (not for a guest with an
// empty cart, and not twice within 30 s for the same cart: row 166).
// The wording is the plugin's own labels (Common.sppCommerce in src/commerce/i18n/labels.json: under a namespace the store passes to the browser), merged into the store's.
// The same slot is filled by the theme (announcement bar, trust strip): the store passes each package what the earlier
// ones rendered as children, so both show; this plugin comes after the theme, so its bar wraps the theme's output.

const ROUTE = "/api/extensions/plugins/spp-commerce/my-order";

type IMyOrder = { items: number; subtotal: number; freeShippingOver: number; remaining: number; minOrderValue?: number; toMinimum?: number; user: { name: string; budget: number } | null };

const money = (value: number) => `$${value.toFixed(2)}`;
// <b> in the labels: bold
const b = (chunks: ReactNode) => <strong>{chunks}</strong>;

// the rep the shopper came through: the spp_rep cookie the plugin's rep route sets (read after the page has loaded,
// so the server's and the browser's first render agree)
function useRep() {
  const [rep, setRep] = useState("");
  useEffect(() => {
    const code = decodeURIComponent(document.cookie.match(/(?:^|;\s*)spp_rep=([^;]*)/)?.[1] || "");
    const reps = settings.salesReps && typeof settings.salesReps === "object" ? (settings.salesReps as Record<string, unknown>) : {};
    setRep(typeof reps[code] === "string" ? (reps[code] as string) : "");
  }, []);
  return rep;
}

// Row 166: the store limits plugin routes to 120 calls a minute per shopper address, and everyone behind one office
// address shares that. So the bar calls my-order only when it has something to show (not for a guest with an empty
// cart). It also reuses an answer for the same cart and sign-in for 30 s (sessionStorage, this tab), so moving between
// pages costs no call. If a call is refused (429) or fails, the last answer stays on screen.
const CACHE_KEY = "spp-commerce:my-order";
const FRESH_MS = 30000;
type ICachedOrder = { count: number; signedIn: boolean; at: number; order: IMyOrder };

function readCache(): ICachedOrder | null {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeCache(value: ICachedOrder) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // storage off (private mode): the next page asks again
  }
}

function useMyOrder(count: number, signedIn: boolean) {
  const [order, setOrder] = useState<IMyOrder | null>(null);
  useEffect(() => {
    // a guest with an empty cart: nothing to total, so no call
    if (!count && !signedIn) {
      setOrder(null);
      return;
    }
    const cached = readCache();
    const same = Boolean(cached && cached.count === count && cached.signedIn === signedIn);
    if (cached && same) setOrder(cached.order);
    if (cached && same && Date.now() - cached.at < FRESH_MS) return;
    let live = true;
    fetch(ROUTE, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: IMyOrder | null) => {
        if (!live || !data) return;
        setOrder(data);
        writeCache({ count, signedIn, at: Date.now(), order: data });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [count, signedIn]);
  return order;
}

export function AccountBar(props: { children?: ReactNode }) {
  const t = useSppTranslations();
  const sessionUser = host?.stores.useUser() ?? null;
  const count = host?.stores.useCartCount() ?? 0;
  const order = useMyOrder(count, Boolean(sessionUser));
  const rep = useRep();
  if (settings.showAccountBar === false) return <>{props.children}</>;
  const name = order?.user?.name || sessionUser?.userName;
  const meter = order && order.freeShippingOver > 0 && order.items > 0;
  const progress = meter ? Math.min(100, Math.round((order.subtotal / order.freeShippingOver) * 100)) : 0;
  return (
    <>
      <div className="spp-commerce-account" data-test-selector="divAccountBar">
        {name ? (
          <span>
            {t.rich("signedInAs", { name, b })}
            {order?.user?.budget ? <> · {t("budgetLeft", { amount: money(order.user.budget) })}</> : null}
          </span>
        ) : (
          <span>
            <Link href="/login" className="spp-commerce-account__link" data-test-selector="linkAccountSignIn">
              {t("signIn")}
            </Link>{" "}
            {t("toSeePricing")}
          </span>
        )}
        {rep && (
          <span className="spp-commerce-account__rep" data-test-selector="divSalesRep">
            {t.rich("yourRep", { name: rep, b })}
          </span>
        )}
        {meter ? (
          <span className="spp-commerce-account__order" data-test-selector="divFreeShippingMeter">
            <span>
              {t.rich("inYourOrder", { amount: money(order.subtotal), b })} ·{" "}
              {/* under the minimum order value (row 107): what is missing to check out comes first */}
              {order.toMinimum ? t.rich("addForMinimum", { amount: money(order.toMinimum), minimum: money(order.minOrderValue || 0), b }) : order.remaining > 0 ? t.rich("addForFreeShipping", { amount: money(order.remaining), b }) : t.rich("shipsFree", { b })}
            </span>
            <span className="spp-commerce-account__meter" role="progressbar" aria-label={t("towardFreeShipping")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <span style={{ width: `${progress}%` }} />
            </span>
          </span>
        ) : (
          <span className="spp-commerce-account__cart">{t("items", { count })}</span>
        )}
      </div>
      {props.children}
    </>
  );
}
