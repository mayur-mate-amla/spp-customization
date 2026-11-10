import type { ReactNode } from "react";
import { settings } from "../lib/host.js";

// Slot product.card: a New badge on the store's product card (children) when the product's NewProduct attribute is
// true, unless the showBadge setting is off.

type IProduct = { attributes?: { attributeCode?: string; attributeValues?: string }[] };

export function ProductBadge(props: { children?: ReactNode; product?: IProduct }) {
  const isNew = props.product?.attributes?.some((item) => item.attributeCode === "NewProduct" && item.attributeValues === "true");
  return (
    <div className="spp-customization-card">
      {settings.showBadge !== false && isNew && <span className="spp-customization-badge">New</span>}
      {props.children}
    </div>
  );
}
