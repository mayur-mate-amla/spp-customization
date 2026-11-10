import type { ReactNode } from "react";
import Link from "next/link";
import { settings } from "../lib/host.js";

// Slot layout.header: a bar above the store's header (children), text from the announcement setting, with a link to
// the theme's welcome page. Empty setting: the store's header as it is.

export function AnnouncementBar(props: { children?: ReactNode }) {
  const text = String(settings.announcement || "");
  return (
    <>
      {text && (
        <div className="spp-customization-announcement" data-test-selector="divAnnouncement">
          <span>{text}</span>
          <Link href="/spp-customization-welcome" className="spp-customization-announcement__link" data-test-selector="linkAnnouncement">
            Learn more
          </Link>
        </div>
      )}
      {props.children}
    </>
  );
}
