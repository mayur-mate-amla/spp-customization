import type { ReactNode } from "react";
import { settings } from "../lib/host.js";

// Slot layout.header: a bar above the store's header (children), text from the announcement setting. Empty setting:
// the store's header as it is.

export function AnnouncementBar(props: { children?: ReactNode }) {
  const text = String(settings.announcement || "");
  return (
    <>
      {text && (
        <div className="spp-customization-announcement" data-test-selector="divAnnouncement">
          {text}
        </div>
      )}
      {props.children}
    </>
  );
}
