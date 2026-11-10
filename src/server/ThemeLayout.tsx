import type { ReactNode } from "react";

// Server slot layout.root: every store page, header to footer (children), with the theme's accent color. The
// typography comes from the theme family (parent redpanda: Montserrat), so this wrapper sets no font of its own. The
// store's body is a flex column whose main area grows, so this wrapper grows too and the footer stays at the bottom.

// a CSS value from settings, without what could end the declaration
const cssValue = (value: unknown) => String(value ?? "").replace(/[^#a-zA-Z0-9(),.% -]/g, "").trim();

export function ThemeLayout(props: { children?: ReactNode; settings: Record<string, unknown> }) {
  const accent = cssValue(props.settings.accentColor);
  return (
    <div className="spp-customization-layout" data-test-selector="divThemeLayout" style={accent ? ({ "--theme-accent": accent } as Record<string, string>) : undefined}>
      {props.children}
    </div>
  );
}
