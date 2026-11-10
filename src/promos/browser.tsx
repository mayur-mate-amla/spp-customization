import { useEffect, useState, type ReactNode } from "react";
import type { IBrowserHost, IBrowserPlugin } from "znode-plugin/types/extension-api";

// spp-promos: a sale countdown bar above the header ("Holiday sale: 20% off drinkware · ends in 2d 04h 12m"), from the
// saleText and saleEndsAt settings. The countdown starts after the page loads (the server render shows the text only),
// ticks every 30 s and the bar disappears when the sale is over.

let settings: Record<string, unknown> = {};

function left(end: number, now: number) {
  const minutes = Math.max(0, Math.floor((end - now) / 60000));
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return `${d ? `${d}d ` : ""}${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

function SaleBar(props: { children?: ReactNode }) {
  const end = Date.parse(String(settings.saleEndsAt || ""));
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const over = !Number.isFinite(end) || (now !== null && now >= end);
  return (
    <>
      {!over && (
        <div className="spp-promos-sale" data-test-selector="divSaleCountdown">
          <span>{String(settings.saleText || "")}</span>
          {now !== null && <strong className="spp-promos-sale__left">ends in {left(end, now)}</strong>}
        </div>
      )}
      {props.children}
    </>
  );
}

export default function setup(host: IBrowserHost): IBrowserPlugin {
  settings = host.settings;
  return { slots: { "layout.header": SaleBar } };
}
