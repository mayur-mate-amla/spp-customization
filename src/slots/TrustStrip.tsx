import { useEffect, useState } from "react";

// A trust-badge strip under the store's header ("Secure checkout · Free returns · Ships in 24h"), as most storefronts
// show near the top. Its markup uses the same utility classes as the client's live site (copied with its CSS); the
// build drops the utility rules the store already has ("dedupeStyles": true), so they cannot clash with the store's.
// The shipping item asks the theme's own route for the dispatch cutoff ("Order within 3h 12m to ship today") once the
// page has loaded; until then, or where the route is not available, it says "Ships in 24 hours".

const ROUTE = "/api/extensions/plugins/spp-customization/shipping-cutoff";

const ITEMS = [
  { id: "secure", text: "Secure checkout", path: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z" },
  { id: "returns", text: "Free 30-day returns", path: "M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" },
  { id: "shipping", text: "Ships in 24 hours", path: "M3 6h11v9h2.5l2.5-4h-4V8h5l3 5v4h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3V6Z" },
];

function useShippingLabel() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    let live = true;
    fetch(ROUTE, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => live && data && typeof data.label === "string" && setLabel(data.label))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return label;
}

export function TrustStrip() {
  const shipping = useShippingLabel();
  return (
    <ul className="spp-customization-trust flex flex-wrap items-center justify-center gap-6 py-2 text-sm" data-test-selector="listTrustStrip" aria-label="Why shop with us">
      {ITEMS.map((item) => (
        <li key={item.id} className="spp-customization-trust__item flex items-center gap-2" data-test-selector={`listItemTrust-${item.id}`}>
          <svg className="spp-customization-trust__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d={item.path} fill="currentColor" />
          </svg>
          <span>{item.id === "shipping" && shipping ? shipping : item.text}</span>
        </li>
      ))}
    </ul>
  );
}
