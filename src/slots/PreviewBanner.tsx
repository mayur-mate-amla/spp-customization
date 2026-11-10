import { useEffect, useState } from "react";

// While this theme is being previewed (/api/extensions/preview?theme=spp-customization sets the runtimeThemePreview
// cookie in this browser only), a bar at the very top says so and offers to leave the preview, so nobody mistakes a
// preview for the live store. Shoppers never see it: they have no preview cookie. The cookie is read after the page
// loads (the server render has no document), so the first render is the same on the server and in the browser.

const PREVIEW_COOKIE = "runtimeThemePreview";
const THEME = "spp-customization";

function previewedTheme() {
  const match = document.cookie.split("; ").find((item) => item.startsWith(`${PREVIEW_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(PREVIEW_COOKIE.length + 1)) : "";
}

export function PreviewBanner() {
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => setPreviewing(previewedTheme() === THEME), []);
  if (!previewing) return null;
  const here = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;
  return (
    <div className="spp-customization-preview" role="status" data-test-selector="divThemePreview">
      <span>
        Previewing theme <strong>{THEME}</strong>: only you see this
      </span>
      <a href={`/api/extensions/preview?to=${encodeURIComponent(here)}`} className="spp-customization-preview__exit" data-test-selector="linkExitPreview">
        Exit preview
      </a>
    </div>
  );
}
