import type { IBrowserHost, IBrowserPlugin } from "znode-plugin/types/extension-api";
import { bindHost } from "./lib/host.js";
import { AnnouncementBar } from "./slots/AnnouncementBar.js";
import { ProductBadge } from "./slots/ProductBadge.js";
import { SearchWithPopular } from "./slots/SearchWithPopular.js";
import { CustomizeToOrder } from "./slots/CustomizeToOrder.js";
import { ProductFacts } from "./slots/ProductFacts.js";
import { FooterHelp } from "./slots/FooterHelp.js";
import { ProductListing } from "./slots/ProductListing.js";
import { AddedToCart } from "./slots/AddedToCart.js";
import { HeadTags } from "./slots/HeadTags.js";
import { Hero, HERO_EDITOR } from "./widgets/Hero.js";
import { Testimonials, TESTIMONIALS_EDITOR } from "./widgets/Testimonials.js";
import { Faq, FAQ_EDITOR } from "./widgets/Faq.js";
import { PromoBanner, PROMO_BANNER_EDITOR } from "./widgets/PromoBanner.js";

// Spp Customization, browser part: what renders in the store's pages (on the server first, then hydrated in the browser).
//   Slots: wrap or replace a part of the store; the component gets the slot's props, and the store's own rendering as
//          children (keep it, add to it, or replace it). Slot names: znode-plugin/types/extension-api.d.ts.
//   Widgets: blocks for the page builder, with their settings.
// Server parts (layouts around pages, whole pages, API routes): server.tsx.

export default function setup(host: IBrowserHost): IBrowserPlugin {
  bindHost(host);
  return {
    slots: {
      // the document <head>: theme-color, favicon, preconnect, analytics script
      "layout.head": HeadTags,
      // preview bar, announcement bar above the store's header, trust strip below it
      "layout.header": AnnouncementBar,
      // a New badge on product cards
      "product.card": ProductBadge,
      // the store's search box with popular searches under it
      "header.search": SearchWithPopular,
      // decorated products: "Customize & order" replaces the store's add-to-cart; then the product's key details
      "product.addToCart": (props: Parameters<typeof CustomizeToOrder>[0]) => (
        <>
          <CustomizeToOrder {...props} />
          <ProductFacts product={props.product as never} isQuickView={props.isQuickView} />
        </>
      ),
      // "Need help?" contact and payments band above the store's footer
      "layout.footer": FooterHelp,
      // the listing with the theme's own product card (the store's listing card has no slot on this theme)
      "productList.layout": ProductListing,
      // the added-to-cart popup
      "addToCart.notification": AddedToCart,
    },
    widgets: {
      SppCustomizationHero: { render: Hero, ...HERO_EDITOR },
      SppTestimonials: { render: Testimonials, ...TESTIMONIALS_EDITOR },
      SppFaq: { render: Faq, ...FAQ_EDITOR },
      SppPromoBanner: { render: PromoBanner, ...PROMO_BANNER_EDITOR },
    },
  };
}
