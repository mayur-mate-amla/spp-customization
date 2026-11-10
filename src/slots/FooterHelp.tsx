import { useEffect, useRef, type ReactNode } from "react";
import { settings } from "../lib/host.js";

// The store places the layout.footer slot next to its own header element. With the parent theme's brand header
// (spp-base), the store's header is kept in a hidden element, so the slot ends up hidden too. Once mounted, the band
// moves its slot container to just before the visible store footer (or to the end of the page) so it always shows.
function useVisibleFooterSlot() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const slot = ref.current?.closest<HTMLElement>('[data-runtime-slot="layout.footer"]');
    if (!slot) return;
    const footers = [...document.querySelectorAll<HTMLElement>('footer, [data-test-selector^="divStoreFooter"]')].filter((element) => !element.closest("[hidden]") && !slot.contains(element));
    const footer = footers[footers.length - 1];
    if (footer?.parentElement && footer.previousElementSibling !== slot) footer.parentElement.insertBefore(slot, footer);
    else if (!footer && slot.closest("[hidden]")) document.querySelector(".spp-customization-layout")?.appendChild(slot);
  }, []);
  return ref;
}

// Slot layout.footer: a "Need help?" band above the store's footer (children, kept): phone, email and opening hours
// from the theme's settings (supportPhone, supportEmail, supportHours) and the payment methods the store accepts, as
// B2B storefronts show before the footer links. Items without a value are left out.

const PAYMENTS = ["Visa", "Mastercard", "Amex", "PayPal", "Purchase order", "Net 30 terms"];

export function FooterHelp(props: { children?: ReactNode }) {
  const phone = String(settings.supportPhone || "").trim();
  const email = String(settings.supportEmail || "").trim();
  const hours = String(settings.supportHours || "").trim();
  const ref = useVisibleFooterSlot();
  return (
    <>
      <section ref={ref} className="spp-customization-help" data-test-selector="divFooterHelp" aria-labelledby="spp-customization-help-title">
        <div className="spp-customization-help__contact">
          <h2 id="spp-customization-help-title" className="spp-customization-help__title">
            Need help with an order?
          </h2>
          <p className="spp-customization-help__text">Our team can quote bulk orders, check decoration options and track shipments.</p>
          <ul className="spp-customization-help__ways">
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} data-test-selector="linkFooterPhone">
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} data-test-selector="linkFooterEmail">
                  {email}
                </a>
              </li>
            )}
            {hours && <li data-test-selector="txtFooterHours">{hours}</li>}
          </ul>
        </div>
        <div className="spp-customization-help__payments">
          <p className="spp-customization-help__label">We accept</p>
          <ul className="spp-customization-help__badges">
            {PAYMENTS.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
        </div>
      </section>
      {props.children}
    </>
  );
}
