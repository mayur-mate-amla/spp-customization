import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { host } from "../lib/host.js";

// Slot addToCart.notification: the theme's "Added to your order" popup, in place of the store's (children). It opens
// when the cart's item count goes up (the store's cart state, so it works wherever the shopper adds an item, even
// where the store fills no popup data) and shows the item the store reports when it does (image, SKU, quantity).
// Closes after 6 s, on "Keep shopping" or Escape; "View order" goes to the cart.

type IPopupData = { imageLargePath?: string; sku?: string; quantity?: number | string; productName?: string };

export function AddedToCart(props: { children?: ReactNode; data?: IPopupData | null }) {
  const count = host?.stores.useCartCount() ?? 0;
  const previous = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (previous.current !== null && count > previous.current) setOpen(true);
    previous.current = count;
  }, [count]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 6000);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  const data = props.data || {};
  return (
    <div className="spp-customization-added" role="status" aria-live="polite" data-test-selector="divAddedToOrder">
      <div className="spp-customization-added__head">
        <span className="spp-customization-added__check" aria-hidden="true">
          ✓
        </span>
        <strong>Added to your order</strong>
        <button type="button" className="spp-customization-added__close" aria-label="Close" onClick={() => setOpen(false)}>
          ×
        </button>
      </div>
      {(data.sku || data.imageLargePath) && (
        <div className="spp-customization-added__item">
          {data.imageLargePath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageLargePath} alt="" width={56} height={56} />
          )}
          <span>
            {data.productName || data.sku}
            {data.quantity ? ` × ${data.quantity}` : ""}
          </span>
        </div>
      )}
      <p className="spp-customization-added__count">
        {count} item{count === 1 ? "" : "s"} in your order
      </p>
      <div className="spp-customization-added__actions">
        <Link href="/cart" className="spp-customization-added__view" data-test-selector="linkAddedViewOrder" onClick={() => setOpen(false)}>
          View order
        </Link>
        <button type="button" className="spp-customization-added__keep" data-test-selector="btnAddedKeepShopping" onClick={() => setOpen(false)}>
          Keep shopping
        </button>
      </div>
    </div>
  );
}
