import { useEffect, useState } from "react";

// A trust-badge strip under the store's header ("Secure checkout · Free returns · Ships in 24h"), as most storefronts
// show near the top. Its markup uses the same utility classes as the client's live site (copied with its CSS); the
// build drops the utility rules the store already has ("dedupeStyles": true), so they cannot clash with the store's.
// Live store status comes from the theme's own BFF API, store-status (src/server/status.ts), in one call once the page
// has loaded: the dispatch cutoff ("Order within 3h 12m to ship today") and whether customer service is open ("Customer
// service open until 6pm", a call link). Until then, or where the API is not available, the strip shows its fixed text.

const ROUTE = "/api/extensions/plugins/spp-customization/store-status";

type IStatus = { support?: { open: boolean; label: string; phone: string }; shipping?: { label: string } };

const ITEMS = [
  { id: "secure", text: "Secure checkout", path: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z" },
  { id: "returns", text: "Free 30-day returns", path: "M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" },
  { id: "shipping", text: "Ships in 24 hours", path: "M3 6h11v9h2.5l2.5-4h-4V8h5l3 5v4h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3V6Z" },
];
const PHONE_ICON = "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z";

function useStoreStatus() {
  const [status, setStatus] = useState<IStatus | null>(null);
  useEffect(() => {
    let live = true;
    fetch(ROUTE)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => live && data && setStatus(data))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return status;
}

export function TrustStrip() {
  const status = useStoreStatus();
  const shipping = status?.shipping?.label;
  const support = status?.support;
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
      {support?.label && (
        <li className={`spp-customization-trust__item spp-customization-trust__support flex items-center gap-2${support.open ? " is-open" : ""}`} data-test-selector="listItemTrust-support">
          <svg className="spp-customization-trust__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d={PHONE_ICON} fill="currentColor" />
          </svg>
          <span>
            {support.label}
            {support.open && support.phone && (
              <>
                {" · "}
                <a href={`tel:${support.phone.replace(/[^+0-9]/g, "")}`}>{support.phone}</a>
              </>
            )}
          </span>
        </li>
      )}
    </ul>
  );
}
