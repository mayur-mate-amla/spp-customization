import type { IBrowserHost, IBrowserPlugin } from "znode-plugin/types/extension-api";
import { bindHost } from "./lib/host.js";
import { AnnouncementBar } from "./slots/AnnouncementBar.js";
import { ProductBadge } from "./slots/ProductBadge.js";
import { SearchWithPopular } from "./slots/SearchWithPopular.js";
import { Hero, HERO_EDITOR } from "./widgets/Hero.js";
import { Testimonials, TESTIMONIALS_EDITOR } from "./widgets/Testimonials.js";

// Spp Customization, browser part: what renders in the store's pages (on the server first, then hydrated in the browser).
//   Slots: wrap or replace a part of the store; the component gets the slot's props, and the store's own rendering as
//          children (keep it, add to it, or replace it). Slot names: znode-plugin/types/extension-api.d.ts.
//   Widgets: blocks for the page builder, with their settings.
// Server parts (layouts around pages, whole pages, API routes): server.tsx.

export default function setup(host: IBrowserHost): IBrowserPlugin {
  bindHost(host);
  return {
    slots: {
      // an announcement bar above the store's header
      "layout.header": AnnouncementBar,
      // a New badge on product cards
      "product.card": ProductBadge,
      // the store's search box with popular searches under it
      "header.search": SearchWithPopular,
    },
    widgets: {
      SppCustomizationHero: { render: Hero, ...HERO_EDITOR },
      SppTestimonials: { render: Testimonials, ...TESTIMONIALS_EDITOR },
    },
  };
}
