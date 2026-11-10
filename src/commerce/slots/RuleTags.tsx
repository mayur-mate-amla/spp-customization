import type { ReactNode } from "react";
import { lineNotes } from "../rules.js";
import { settings } from "../host.js";

// Slot product.card (spp-commerce): the store's ordering rules on the product card, before the shopper adds anything
// ("Sold in cases of 10", "Minimum order 25", "Limit 5 per order"). The same settings and the same wording as the cart
// rules (onCartChanged) and the cart-line notes (mapCartItems), so card, cart and checkout agree. The card itself
// (children: the store's card, or a theme's) is kept as it is; the tags sit over its top edge.

type IProduct = { sku?: string; SKU?: string; publishProductId?: number };

const map = (key: string) => (settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {});

export function RuleTags(props: { children?: ReactNode; product?: IProduct }) {
  const sku = String(props.product?.sku || props.product?.SKU || "");
  const notes = settings.cardTags === false || !sku ? [] : lineNotes(sku, map("casePacks"), map("orderLimits"), map("minimums"));
  if (!notes.length) return <>{props.children}</>;
  return (
    <div className="spp-commerce-rules-card">
      {props.children}
      <ul className="spp-commerce-rules-card__tags" aria-label="Ordering rules">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
