import type { ReactNode } from "react";
import type { IPluginRouteContext, IPluginRouteRequest, IRuntimePlugin, IServerSlotContext } from "znode-plugin/types/extension-api";
import { getHighlights, IHighlight } from "./server/data.js";
import { ThemeLayout } from "./server/ThemeLayout.js";
import { shippingCutoff } from "./server/shipping.js";
import { storeStatus } from "./server/status.js";
import { WelcomePage } from "./server/WelcomePage.js";
import { LoginPage } from "./server/LoginPage.js";

// Spp Customization, server part: runs only on the store's server, never in the browser.
//   serverSlots: server components around a part of a store page (layout.root = every page, header to footer)
//   serverPages: whole pages at new URLs (list them in znode-package.json "serverPages" too)
//   routes:      your API, /api/extensions/plugins/spp-customization/<route>
// They may be async (fetch data, call an API) and use next/image, next/link and next/font/google.

// GET .../highlights?limit=3: the store's highlights for the SppHighlights widget and the welcome page; the source is
// read here, on the store's server, so the widget never needs its address or key
async function highlights(request: IPluginRouteRequest, context: IPluginRouteContext): Promise<{ store: string; loadedAt: string; items: IHighlight[] }> {
  const limit = Math.max(1, Math.min(6, Number(request.query.limit) || 6));
  const items = await getHighlights(context.store.code);
  return { store: context.store.code, loadedAt: new Date().toISOString(), items: items.slice(0, limit) };
}

const plugin: IRuntimePlugin = {
  name: "spp-customization",
  apiVersion: 1,
  hooks: {},
  // store-status: the theme's BFF API for the header (support hours, ship cutoff, notice in one call)
  routes: { highlights, "shipping-cutoff": shippingCutoff, "store-status": storeStatus },
  serverSlots: {
    "layout.root": (props: { children?: ReactNode }, context: IServerSlotContext) => <ThemeLayout settings={context.settings}>{props.children}</ThemeLayout>,
    // the sign-in page in the store's B2B voice, around the store's own forms (row 130)
    "login.page": (props: { children?: ReactNode }, context: IServerSlotContext) => <LoginPage settings={context.settings}>{props.children}</LoginPage>,
  },
  serverPages: {
    "/spp-customization-welcome": {
      render: (_props, context) => <WelcomePage storeCode={context.store.code} />,
      metadata: { title: "Welcome", description: "What Spp Customization brings to this store." },
    },
  },
};

export default plugin;
