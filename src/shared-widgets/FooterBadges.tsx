// SppFooterBadges: the row of memberships and guarantees promotional-products stores show in their footer ("ASI
// member", "PPAI member", "Secure checkout", "Proof before print"). Made for the footer (and header) layout pages of
// the page builder: light text on the footer's dark background, one line on desktop, wrapping on phones. The merchant
// edits the badges and their order in the page builder. Renders the same on the server and in the browser.

type IBadge = { title?: string; detail?: string };
type IFooterBadgesProps = { id?: string; heading?: string; items?: IBadge[]; tone?: "dark" | "light" };

export function FooterBadges(props: IFooterBadgesProps) {
  const items = (props.items || []).filter((item) => item && item.title);
  if (!items.length) return null;
  return (
    <section className={`spp-widgets-badges spp-widgets-badges--${props.tone === "dark" ? "dark" : "light"}`} data-test-selector={`divFooterBadges${props.id || ""}`} aria-label={props.heading || "Memberships and guarantees"}>
      {props.heading && <p className="spp-widgets-badges__heading">{props.heading}</p>}
      <ul className="spp-widgets-badges__list">
        {items.map((item, index) => (
          <li key={index} className="spp-widgets-badges__item" data-test-selector={`listItemFooterBadge${index}`}>
            <svg className="spp-widgets-badges__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z" fill="currentColor" />
            </svg>
            <span>
              <strong>{item.title}</strong>
              {item.detail && <small>{item.detail}</small>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const FOOTER_BADGES_EDITOR = {
  label: "Footer badges",
  category: "SPP shared",
  fields: {
    heading: { type: "text", label: "Heading (read by screen readers; shown when set)" },
    tone: { type: "radio", label: "Background", options: [{ label: "Light (own background)", value: "light" }, { label: "Dark footer", value: "dark" }] },
    items: {
      type: "array",
      label: "Badges",
      arrayFields: { title: { type: "text", label: "Title" }, detail: { type: "text", label: "Detail" } },
      defaultItemProps: { title: "", detail: "" },
    },
  },
  defaultProps: {
    heading: "",
    tone: "light",
    items: [
      { title: "ASI member", detail: "#123456" },
      { title: "PPAI member", detail: "Since 2009" },
      { title: "Proof before print", detail: "Free digital proof" },
      { title: "Secure checkout", detail: "PCI DSS compliant" },
    ],
  },
};
