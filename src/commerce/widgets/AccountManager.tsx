// SppAccountManager (spp-commerce plugin): the "Your account manager" card B2B storefronts show on the home and account
// pages: the rep's initials, name, title, phone, email and a "Request a quote" button (an email with the subject filled
// in). A plugin's widget: offered in the page builder of every store the plugin is placed for, whatever its theme.

type IAccountManagerProps = { id?: string; heading?: string; name?: string; title?: string; phone?: string; email?: string; quoteSubject?: string };

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export function AccountManager(props: IAccountManagerProps) {
  const subject = encodeURIComponent(props.quoteSubject || "Quote request");
  return (
    <section className="spp-commerce-rep" data-test-selector={`divAccountManager${props.id || ""}`}>
      {props.heading && <h2 className="spp-commerce-rep__heading">{props.heading}</h2>}
      <div className="spp-commerce-rep__card">
        <span className="spp-commerce-rep__avatar" aria-hidden="true">
          {initials(props.name)}
        </span>
        <div className="spp-commerce-rep__who">
          <p className="spp-commerce-rep__name">{props.name}</p>
          {props.title && <p className="spp-commerce-rep__title">{props.title}</p>}
          <p className="spp-commerce-rep__ways">
            {props.phone && <a href={`tel:${props.phone.replace(/[^+0-9]/g, "")}`}>{props.phone}</a>}
            {props.email && <a href={`mailto:${props.email}`}>{props.email}</a>}
          </p>
        </div>
        {props.email && (
          <a className="spp-commerce-rep__quote" href={`mailto:${props.email}?subject=${subject}`} data-test-selector="linkRequestQuote">
            Request a quote
          </a>
        )}
      </div>
    </section>
  );
}

export const ACCOUNT_MANAGER_EDITOR = {
  label: "Your account manager",
  category: "SPP commerce",
  fields: {
    heading: { type: "text", label: "Heading" },
    name: { type: "text", label: "Name" },
    title: { type: "text", label: "Title" },
    phone: { type: "text", label: "Phone" },
    email: { type: "text", label: "Email" },
    quoteSubject: { type: "text", label: "Quote email subject" },
  },
  defaultProps: {
    heading: "Your account manager",
    name: "Jordan Rivera",
    title: "Senior account manager, promotional products",
    phone: "1-800-555-0142",
    email: "jordan.rivera@sppbrandedgoods.example",
    quoteSubject: "Quote request from my company store",
  },
};
