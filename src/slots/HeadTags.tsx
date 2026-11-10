import { settings } from "../lib/host.js";

// Slot layout.head: tags for the document <head> of every page (React places <meta>, <link> and <script async src> in
// the head, on the server render too):
//   - theme-color: the brand color for the browser's toolbar on phones (accentColor setting)
//   - a brand favicon (the co-brand mark)
//   - preconnect to the product-image host, so the first product image starts loading sooner
//   - the global analytics bootstrap script (async), a tag-manager-style data layer with a page_view event

const FILES = "/api/extensions/files";

export function HeadTags(props: { store?: { code?: string } }) {
  const color = String(settings.accentColor || "#f26b1d").replace(/[^#a-zA-Z0-9(),. %-]/g, "");
  return (
    <>
      <meta name="theme-color" content={color} />
      <link rel="icon" type="image/svg+xml" href={`${FILES}/spp-customization-favicon.svg`} />
      <link rel="preconnect" href="https://imagelab.artifi.net" />
      <script async src={`${FILES}/spp-customization-analytics.mjs`} data-store={props.store?.code || ""} />
    </>
  );
}
