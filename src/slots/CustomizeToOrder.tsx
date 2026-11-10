import type { ReactNode } from "react";
import Link from "next/link";
import { settings } from "../lib/host.js";

// Slot product.addToCart, for decorated products: branded merchandise is ordered after the buyer adds a logo, so for
// the SKUs in the customizableSkus setting the store's add-to-cart (children) is REPLACED by a "Customize & order"
// call to action that opens the store's customizer with this product. Every other product keeps the store's own
// add-to-cart, untouched. (A component override: the children are not rendered for those products.)

type IProduct = { sku?: string; configurableProductSku?: string; name?: string; minimumQuantity?: string | number };

export function CustomizeToOrder(props: { children?: ReactNode; product?: IProduct; isQuickView?: boolean }) {
  const skus = Array.isArray(settings.customizableSkus) ? (settings.customizableSkus as unknown[]).map((sku) => String(sku).toLowerCase()) : [];
  const sku = String(props.product?.configurableProductSku || props.product?.sku || "");
  if (!sku || !skus.includes(sku.toLowerCase())) return <>{props.children}</>;
  const minimum = Number(props.product?.minimumQuantity) || 1;
  return (
    <div className="spp-customization-customize" data-test-selector="divCustomizeToOrder">
      <ol className="spp-customization-customize__steps">
        <li>Add your logo or text</li>
        <li>Approve a free digital proof</li>
        <li>Order{minimum > 1 ? ` (minimum ${minimum})` : ""}</li>
      </ol>
      <Link href={`/customizer?productCode=${encodeURIComponent(sku)}`} className="spp-customization-customize__button" data-test-selector="linkCustomizeToOrder">
        Customize &amp; order
      </Link>
    </div>
  );
}
