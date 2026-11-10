import type { ReactNode } from "react";
import { inter } from "./fonts.js";

// Server slot layout.root: every store page, header to footer (children), in the theme's font and accent color. The
// store's body is a flex column whose main area grows, so this wrapper grows too and the footer stays at the bottom.

// a CSS value from settings, without what could end the declaration
const cssValue = (value: unknown) => String(value ?? "").replace(/[^#a-zA-Z0-9(),.% -]/g, "").trim();

export function ThemeLayout(props: { children?: ReactNode; settings: Record<string, unknown> }) {
  const accent = cssValue(props.settings.accentColor);
  return (
    <div className={`spp-customization-layout ${inter.className}`} data-test-selector="divThemeLayout" style={accent ? ({ "--theme-accent": accent } as Record<string, string>) : undefined}>
      {props.children}
    </div>
  );
}
