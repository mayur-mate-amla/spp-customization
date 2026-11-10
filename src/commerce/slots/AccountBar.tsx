import type { ReactNode } from "react";
import Link from "next/link";
import { host, settings } from "../host.js";

// Slot layout.header (spp-commerce): a thin B2B account bar above everything else in the header: who is signed in and
// that their account pricing applies, or a sign-in prompt for guests, as B2B storefronts show. The same slot is filled
// by the theme (announcement bar, trust strip): the store passes each package what the earlier ones rendered as
// children, so both show; this plugin comes after the theme, so its bar wraps the theme's output and sits on top.

export function AccountBar(props: { children?: ReactNode }) {
  const user = host?.stores.useUser() ?? null;
  const count = host?.stores.useCartCount() ?? 0;
  if (settings.showAccountBar === false) return <>{props.children}</>;
  return (
    <>
      <div className="spp-commerce-account" data-test-selector="divAccountBar">
        {user ? (
          <span>
            Signed in as <strong>{user.userName}</strong> · your account pricing applies
          </span>
        ) : (
          <span>
            <Link href="/login" className="spp-commerce-account__link" data-test-selector="linkAccountSignIn">
              Sign in
            </Link>{" "}
            to see your account pricing
          </span>
        )}
        <span className="spp-commerce-account__cart">
          {count} item{count === 1 ? "" : "s"} in your order
        </span>
      </div>
      {props.children}
    </>
  );
}
