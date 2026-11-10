import { settings } from "../lib/host.js";

// Slot layout.head: tags for the document <head> of every page (React places <meta>, <link> and <script async src> in
// the head, on the server render too: they are in the HTML search engines and link previews read):
//   - theme-color: the brand color for the browser's toolbar on phones (accentColor setting)
//   - a brand favicon (the co-brand mark)
//   - preconnect to the product-image host, so the first product image starts loading sooner
//   - the global analytics bootstrap script (async), a tag-manager-style data layer with a page_view event
//   - the brand's social and app tags (row 133): og:site_name, og:type, og:locale, twitter:card, application-name,
//     apple-mobile-web-app-title (setting brandName), and the search console's site verification (setting
//     siteVerification, set per store). A page's own <title> and description stay the CMS's (each page's SEO fields,
//     through Next.js metadata): a theme adds tags, it does not replace those.

const FILES = "/api/extensions/files";
const clean = (value: unknown) => String(value || "").replace(/[<>"]/g, "").trim();

export function HeadTags(props: { store?: { code?: string } }) {
  const color = String(settings.accentColor || "#f26b1d").replace(/[^#a-zA-Z0-9(),. %-]/g, "");
  const brand = clean(settings.brandName);
  const verification = clean(settings.siteVerification);
  return (
    <>
      <meta name="theme-color" content={color} />
      <link rel="icon" type="image/svg+xml" href={`${FILES}/spp-customization-favicon.svg`} />
      <link rel="preconnect" href="https://imagelab.artifi.net" />
      <script async src={`${FILES}/spp-customization-analytics.mjs`} data-store={props.store?.code || ""} />
      {brand && (
        <>
          <meta property="og:site_name" content={brand} />
          <meta property="og:type" content="website" />
          <meta property="og:locale" content="en_US" />
          <meta name="twitter:card" content="summary" />
          <meta name="application-name" content={brand} />
          <meta name="apple-mobile-web-app-title" content={brand} />
        </>
      )}
      {verification && <meta name="google-site-verification" content={verification} />}
    </>
  );
}
