import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ruleFacts } from "../rules.js";
import { settings } from "../host.js";

// Slot product.card (spp-commerce): the store's ordering rules on the product card, before the shopper adds anything
// ("Sold in cases of 10", "Minimum order 25", "Limit 5 per order"). The same settings and the same wording as the cart
// rules (onCartChanged) and the cart-line notes (mapCartItems), so card, cart and checkout agree. The card itself
// (children: the store's card, or a theme's) is kept as it is; the tags sit over its top edge. The wording is the
// plugin's labels (Common.sppCommerce.casePack / minimum / limit in src/commerce/i18n/labels.json), merged into the store's.

type IProduct = { sku?: string; SKU?: string; publishProductId?: number };

const map = (key: string) => (settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {});

export function RuleTags(props: { children?: ReactNode; product?: IProduct }) {
  const t = useTranslations("Common.sppCommerce");
  const sku = String(props.product?.sku || props.product?.SKU || "");
  const facts = settings.cardTags === false || !sku ? [] : ruleFacts(sku, map("casePacks"), map("orderLimits"), map("minimums"));
  if (!facts.length) return <>{props.children}</>;
  const notes = facts.map((fact) => t(fact.rule, { count: fact.count }));
  return (
    <div className="spp-commerce-rules-card">
      {props.children}
      <ul className="spp-commerce-rules-card__tags" aria-label={t("orderingRules")}>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
