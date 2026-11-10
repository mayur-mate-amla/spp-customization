import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSppTranslations } from "../i18n.js";
import { settings } from "../host.js";

// Slot checkout.address (spp-commerce, row 116): the store's address section (children) kept as it is, with two
// additions around it:
//   - a PO Box guard: decorated orders ship by ground freight, which does not deliver to PO boxes. The slot listens to
//     the store's own address fields (input events bubble to this wrapper: address1, address2), warns as soon as a PO
//     Box is typed, and stops "Save changes" while one is there (a submit handler in the capture phase runs before the
//     store's own form handler; nothing is saved). Setting noPoBoxes turns it off.
//   - the delivery date for the ZIP being typed (postalCode), from the plugin's delivery-estimate route (row 093), or
//     for the ZIP the shopper gave on a product page.
// The store's checkout calls (props.checkout: saveAddress, ...) are not needed: the store's own form saves the address.

const PO_BOX = /\b(p\.?\s*o\.?\s*box|post\s+office\s+box|p\.?\s*o\.?\s*b\.?)\s*\d*/i;
const ROUTE = "/api/extensions/plugins/spp-commerce/delivery-estimate";

type IEstimate = { city: string; state: string; zip: string; arrivesBy: string };

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const savedZip = () => {
  try {
    return localStorage.getItem("spp-commerce-zip") || "";
  } catch {
    return "";
  }
};

export function CheckoutAddress(props: { children?: ReactNode }) {
  const t = useSppTranslations();
  const [poBox, setPoBox] = useState(false);
  const [zip, setZip] = useState("");
  const [estimate, setEstimate] = useState<IEstimate | null>(null);
  const guard = settings.noPoBoxes !== false;

  useEffect(() => setZip(savedZip()), []);
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) return setEstimate(null);
    let live = true;
    fetch(`${ROUTE}?zip=${zip}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => live && setEstimate(data))
      .catch(() => live && setEstimate(null));
    return () => {
      live = false;
    };
  }, [zip]);

  // the store's fields, as the shopper types (they keep their own values and validation)
  const onInput = (event: FormEvent<HTMLDivElement>) => {
    const field = event.target as HTMLInputElement;
    if (field.name === "address1" || field.name === "address2") {
      const form = field.form;
      const lines = form ? ["address1", "address2"].map((name) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value || "") : [field.value];
      setPoBox(guard && lines.some((line) => PO_BOX.test(line)));
    }
    if (field.name === "postalCode") setZip(field.value.trim().slice(0, 5));
  };

  // before the store's own submit handler: no save while a PO Box is in the address
  const onSubmitCapture = (event: FormEvent<HTMLDivElement>) => {
    if (!poBox) return;
    event.preventDefault();
    event.stopPropagation();
    document.querySelector<HTMLInputElement>("input[name=address1]")?.focus();
  };

  return (
    <div className="spp-commerce-checkout-address" onInput={onInput} onSubmitCapture={onSubmitCapture}>
      {estimate && (
        <p className="spp-commerce-checkout-address__eta" data-test-selector="paraCheckoutDelivery">
          {t.rich("checkoutArrives", { date: day(estimate.arrivesBy), place: `${estimate.city}, ${estimate.state} ${estimate.zip}`, b: (chunks: ReactNode) => <strong>{chunks}</strong> })}
        </p>
      )}
      {props.children}
      {poBox && (
        <p className="spp-commerce-checkout-address__warning" role="alert" data-test-selector="paraNoPoBox">
          {t.rich("noPoBox", { b: (chunks: ReactNode) => <strong>{chunks}</strong> })}
        </p>
      )}
    </div>
  );
}
