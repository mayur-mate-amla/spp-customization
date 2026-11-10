import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ruleFacts } from "../rules.js";
import { settings } from "../host.js";

// Slot product.card (spp-commerce): the store's ordering rules on the product card, before the shopper adds anything
// ("Sold in cases of 10", "Minimum order 25", "Limit 5 per order"). The same settings and the same wording as the cart
// rules (onCartChanged) and the cart-line notes (mapCartItems), so card, cart and checkout agree. The card itself
// (children: the store's card, or a theme's) is kept as it is; the tags sit over its top edge. The wording is the
// plugin's labels (Common.sppCommerce.casePack / minimum / limit in src/commerce/i18n/labels.json), merged into the store's.
// Stock holds the ERP sent through the erp-stock webhook ("Out until Dec 1") are added from the stock-holds route,
// asked once per page for all the cards, after the page has loaded.

type IProduct = { sku?: string; SKU?: string; publishProductId?: number };
type IHold = { sku: string; backOn: string; note: string };

const map = (key: string) => (settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {});

// one request per page, shared by every card
let holdsRequest: Promise<Map<string, IHold>> | null = null;
function loadHolds() {
  holdsRequest ??= fetch("/api/extensions/plugins/spp-commerce/stock-holds", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { holds: [] }))
    .then((data) => new Map<string, IHold>((Array.isArray(data?.holds) ? data.holds : []).map((hold: IHold) => [hold.sku.toUpperCase(), hold])))
    .catch(() => new Map<string, IHold>());
  return holdsRequest;
}

function useHold(sku: string) {
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

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function RuleTags(props: { children?: ReactNode; product?: IProduct }) {
  const t = useTranslations("Common.sppCommerce");
  const sku = String(props.product?.sku || props.product?.SKU || "");
  const hold = useHold(settings.cardTags === false ? "" : sku);
  const facts = settings.cardTags === false || !sku ? [] : ruleFacts(sku, map("casePacks"), map("orderLimits"), map("minimums"));
  if (!facts.length && !hold) return <>{props.children}</>;
  const notes = facts.map((fact) => t(fact.rule, { count: fact.count }));
  return (
    <div className="spp-commerce-rules-card">
      {props.children}
      <ul className="spp-commerce-rules-card__tags" aria-label={t("orderingRules")}>
        {hold && (
          <li className="spp-commerce-rules-card__hold" data-test-selector={`listItemStockHold${sku}`}>
            {hold.backOn ? t("onHoldUntil", { date: shortDate(hold.backOn) }) : t("onHold")}
          </li>
        )}
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
