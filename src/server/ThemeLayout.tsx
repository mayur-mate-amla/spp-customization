import type { ReactNode } from "react";

// Server slot layout.root: every store page, header to footer (children). The merchant's brand settings become CSS
// variables on this wrapper, so they override the theme's defaults (tokens.css, fonts.css) for everything inside:
//   accentColor  (attribute ThemeAccentColor): buttons, button borders, links on hover, focus outline, announcement bar
//   headingFont  (attribute ThemeHeadingFont): "brand" (Geist, the theme's own file), "family" (Montserrat, from the
//                parent theme) or "system"
// Set per store in Znode admin (the attributes) or in plugins.json; no code change, no deploy. The typography of body
// text comes from the theme family (parent redpanda). The store's body is a flex column whose main area grows, so this
// wrapper grows too and the footer stays at the bottom.

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
  return (
    <div className="spp-customization-layout" data-test-selector="divThemeLayout" style={style}>
      {props.children}
    </div>
  );
}
