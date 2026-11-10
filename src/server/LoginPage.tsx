import type { ReactNode } from "react";

// Server slot login.page (row 130): the store's sign-in and new-account blocks (children, unchanged) with a B2B frame:
// above, why to sign in (the business account's benefits); below, the way in for a buyer whose company has no account
// yet (a business account from customer service, not a retail sign-up). Rendered on the server: in the page's HTML,
// no flicker, no browser code. Phone and hours come from the theme's settings (supportPhone, supportHours).

const BENEFITS = [
  { title: "Your contract pricing", text: "Your company's agreed prices on every item, every time." },
  { title: "Reorder in two clicks", text: "Past orders and saved lists, ready to add to the cart." },
  { title: "Invoices and tracking", text: "Every order's status, proofs and invoices in one place." },
];

export function LoginPage(props: { children?: ReactNode; settings: Record<string, unknown> }) {
  const phone = String(props.settings.supportPhone || "");
  const hours = String(props.settings.supportHours || "");
  return (
    <div className="spp-customization-login" data-test-selector="divThemeLogin">
      <section className="spp-customization-login__intro" aria-labelledby="spp-login-title">
        <h1 id="spp-login-title">Welcome back</h1>
        <p>Sign in to order with your company&apos;s account.</p>
        <ul className="spp-customization-login__benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title}>
              <strong>{benefit.title}</strong>
              <span>{benefit.text}</span>
            </li>
          ))}
        </ul>
      </section>
      {props.children}
      <aside className="spp-customization-login__business" aria-label="Business accounts">
        <p>
          <strong>Ordering for a company without an account?</strong> We set up business accounts with contract pricing and invoice terms.
        </p>
        {phone && (
          <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} className="spp-customization-login__call">
            Call {phone}
            {hours ? ` · ${hours}` : ""}
          </a>
        )}
      </aside>
    </div>
  );
}
