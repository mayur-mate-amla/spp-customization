import type { ReactNode } from "react";
import { datedNotice } from "./notice.js";

// Server slot layout.root: every store page, header to footer (children), rendered on the server.
//   - "Skip to main content": the first focusable element of the page, for keyboard and screen-reader users; it jumps
//     past the header to the page's <main> (or the content after the header)
//   - a dated notice (holiday shipping, closures): noticeText shows only between noticeFrom and noticeUntil, decided on
//     the server with the warehouse's clock (shipTimezone), so it is in the page's HTML and never flickers in
//   - the merchant's brand settings become CSS variables on this wrapper, so they override the theme's defaults
//     (tokens.css, fonts.css) for everything inside:
//       accentColor (attribute ThemeAccentColor): buttons, button borders, hover, focus outline, announcement bar
//       headingFont (attribute ThemeHeadingFont): "brand" (Geist), "family" (Montserrat, from the parent) or "system"
//       logoUrl (attribute ThemeLogoUrl): a store's own header logo (theme.css)
// The store's body is a flex column whose main area grows, so this wrapper grows too and the footer stays at the bottom.

// a CSS value from settings, without what could end the declaration
const cssValue = (value: unknown) => String(value ?? "").replace(/[^#a-zA-Z0-9(),.% -]/g, "").trim();

const HEADING_FONTS: Record<string, string> = {
  brand: "SppBrand, ui-sans-serif, system-ui, sans-serif",
  family: "Montserrat, ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
};


export function ThemeLayout(props: { children?: ReactNode; settings: Record<string, unknown> }) {
  const accent = cssValue(props.settings.accentColor);
  const headingFont = HEADING_FONTS[String(props.settings.headingFont || "brand")] || HEADING_FONTS.brand;
  const style: Record<string, string> = { "--heading-font-family": headingFont };
  if (accent) {
    Object.assign(style, {
      "--theme-accent": accent,
      "--accent": accent,
      "--primary-btn-bg": accent,
      "--btn-border": accent,
      "--hover": accent,
      "--focus-outline-color": accent,
    });
  }
  // logoUrl (attribute ThemeLogoUrl): a store's own header logo, e.g. a co-branded lockup; the header component is
  // untouched, its logo image shows this file instead (theme.css)
  const logo = String(props.settings.logoUrl || "").trim();
  const safeLogo = /^(\/|https:\/\/)[^"'()\s]+$/.test(logo) ? logo : "";
  if (safeLogo) style["--spp-logo"] = `url("${safeLogo}")`;
  // mobileHeaderHeight (row 148): the store header's height on phones and tablets, reserved from the first paint
  // (header.css), so the page does not jump when the header switches to its phone layout after loading
  const reserve = Number(props.settings.mobileHeaderHeight ?? 199);
  if (Number.isFinite(reserve) && reserve >= 0 && reserve <= 600) style["--spp-header-reserve"] = `${Math.round(reserve)}px`;
  const notice = datedNotice(props.settings);
  return (
    <div className="spp-customization-layout" data-test-selector="divThemeLayout" data-logo={safeLogo ? "custom" : undefined} style={style}>
      <a href="#spp-main" className="spp-customization-skip" data-test-selector="linkSkipToContent">
        Skip to main content
      </a>
      {notice && (
        <p className="spp-customization-notice" role="note" data-test-selector="txtDatedNotice">
          {notice}
        </p>
      )}
      {props.children}
    </div>
  );
}
