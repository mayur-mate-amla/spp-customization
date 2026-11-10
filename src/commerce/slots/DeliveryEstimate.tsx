import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSppTranslations } from "../i18n.js";
import { shortDate, useHold } from "../holds.js";
import { settings } from "../host.js";

// Slot product.addToCart (spp-commerce): "Deliver to [ZIP] Check" under the store's add-to-cart (children, kept as it
// is). The date comes from the plugin's delivery-estimate route (the BFF: it asks the ZIP API on the server and works
// out the date); the ZIP is remembered in this browser (localStorage) so every product page shows it at once.
// Not in the quick view (the popup is small). An item on an ERP stock hold (row 109) gets a notice instead of the
// estimate: the store's add-to-cart route refuses it, and its own message only says the add failed.

type IEstimate = { zip: string; city: string; state: string; arrivesBy: string; shipsOn: string };

const ROUTE = "/api/extensions/plugins/spp-commerce/delivery-estimate";
const KEY = "spp-commerce-zip";

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function DeliveryEstimate(props: { children?: ReactNode; isQuickView?: boolean; product?: { sku?: string } }) {
  const t = useSppTranslations();
  const [zip, setZip] = useState("");
  const [estimate, setEstimate] = useState<IEstimate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hold = useHold(String(props.product?.sku || ""));

  const check = async (value: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${ROUTE}?zip=${encodeURIComponent(value)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "");
      setEstimate(data);
      try {
        localStorage.setItem(KEY, value);
        // also for the cart page's delivery dates: the cart hooks read cookies (row 112)
        document.cookie = `spp_zip=${value}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax`;
      } catch {
        // private mode: not remembered
      }
    } catch (failure) {
      setEstimate(null);
      setError(failure instanceof Error && failure.message ? failure.message : t("deliveryUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  // the ZIP from an earlier product page
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(KEY) || "";
    } catch {
      saved = "";
    }
    if (/^\d{5}$/.test(saved)) {
      setZip(saved);
      check(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (props.isQuickView) return <>{props.children}</>;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (/^\d{5}$/.test(zip)) check(zip);
    else setError(t("zipInvalid"));
  };

  if (hold)
    return (
      <>
        {props.children}
        <p className="spp-commerce-hold" role="status" data-test-selector="paraStockHold">
          {t.rich(hold.backOn ? "holdNotice" : "holdNoticeNoDate", { date: hold.backOn ? shortDate(hold.backOn) : "", b: (chunks: ReactNode) => <strong>{chunks}</strong> })}{" "}
          <a href={String(settings.sourcingLink || "/specialorder")}>{t("askAlternatives")}</a>
        </p>
      </>
    );

  return (
    <>
      {props.children}
      <form className="spp-commerce-delivery" onSubmit={submit} data-test-selector="formDeliveryEstimate">
        <label htmlFor="spp-commerce-zip">{t("deliverTo")}</label>
        <input id="spp-commerce-zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, ""))} placeholder="ZIP" />
        <button type="submit" disabled={busy} data-test-selector="btnCheckDelivery">
          {t("checkDelivery")}
        </button>
        <p className="spp-commerce-delivery__result" role="status" aria-live="polite">
          {estimate ? t.rich("arrivesBy", { date: day(estimate.arrivesBy), place: `${estimate.city}, ${estimate.state} ${estimate.zip}`, b: (chunks: ReactNode) => <strong>{chunks}</strong> }) : error}
        </p>
      </form>
    </>
  );
}
