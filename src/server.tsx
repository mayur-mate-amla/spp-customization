import type { ReactNode } from "react";
import type { IPluginRouteContext, IPluginRouteRequest, IRuntimePlugin, IServerSlotContext } from "znode-plugin/types/extension-api";
import { getHighlights, IHighlight } from "./server/data.js";
import { ThemeLayout } from "./server/ThemeLayout.js";
import { shippingCutoff } from "./server/shipping.js";
import { WelcomePage } from "./server/WelcomePage.js";

// Spp Customization, server part: runs only on the store's server, never in the browser.
//   serverSlots: server components around a part of a store page (layout.root = every page, header to footer)
//   serverPages: whole pages at new URLs (list them in znode-package.json "serverPages" too)
//   routes:      your API, /api/extensions/plugins/spp-customization/<route>
// They may be async (fetch data, call an API) and use next/image, next/link and next/font/google.

async function highlights(_request: IPluginRouteRequest, context: IPluginRouteContext): Promise<{ store: string; items: IHighlight[] }> {
  return { store: context.store.code, items: await getHighlights(context.store.code) };
}

const plugin: IRuntimePlugin = {
  name: "spp-customization",
  apiVersion: 1,
  hooks: {},
  routes: { highlights, "shipping-cutoff": shippingCutoff },
  serverSlots: {
    "layout.root": (props: { children?: ReactNode }, context: IServerSlotContext) => <ThemeLayout settings={context.settings}>{props.children}</ThemeLayout>,
  },
  serverPages: {
    "/spp-customization-welcome": {
      render: (_props, context) => <WelcomePage storeCode={context.store.code} />,
      metadata: { title: "Welcome", description: "What Spp Customization brings to this store." },
    },
  },
};

export default plugin;
