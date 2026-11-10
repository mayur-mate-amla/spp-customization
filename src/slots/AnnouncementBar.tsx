import type { ReactNode } from "react";
import Link from "next/link";
import { settings } from "../lib/host.js";
import { TrustStrip } from "./TrustStrip.js";
import { PreviewBanner } from "./PreviewBanner.js";

// Slot layout.header: a bar above the store's header (children), text from the announcement setting, with a link to
// the theme's welcome page and the store's customer service phone (supportPhone, a required setting); below the header,
// the trust strip (showTrustStrip setting). Empty announcement: no bar.

export function AnnouncementBar(props: { children?: ReactNode }) {
  const text = String(settings.announcement || "");
  const phone = String(settings.supportPhone || "").trim();
  return (
    <>
      <PreviewBanner />
      {text && (
        <div className="spp-customization-announcement" data-test-selector="divAnnouncement">
          <span>{text}</span>
          <Link href="/spp-customization-welcome" className="spp-customization-announcement__link" data-test-selector="linkAnnouncement">
            Learn more
          </Link>
          {phone && (
            <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} className="spp-customization-announcement__link" data-test-selector="linkSupportPhone">
              Call {phone}
            </a>
          )}
        </div>
      )}
      {props.children}
      {settings.showTrustStrip !== false && <TrustStrip />}
    </>
  );
}
