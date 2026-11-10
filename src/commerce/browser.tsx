import type { IBrowserHost, IBrowserPlugin } from "znode-plugin/types/extension-api";
import { bindHost } from "./host.js";
import { AccountBar } from "./slots/AccountBar.js";
import { RuleTags } from "./slots/RuleTags.js";
import { DeliveryEstimate } from "./slots/DeliveryEstimate.js";
import { pinPromoted, popupQuantity } from "./transforms.js";
import { AccountManager, ACCOUNT_MANAGER_EDITOR } from "./widgets/AccountManager.js";
import { QuoteRequest, QUOTE_REQUEST_EDITOR } from "./widgets/QuoteRequest.js";

// spp-commerce, browser part: the companion plugin of the spp-customization theme. A plugin runs for the stores it is
// placed for, whatever their theme.

export default function setup(host: IBrowserHost): IBrowserPlugin {
  bindHost(host);
  return {
    slots: {
      // B2B account bar above the header (the theme fills the same slot)
      "layout.header": AccountBar,
      // the ordering rules (case packs, minimums, limits) on every product card, from the same settings as the cart rules
      "product.card": RuleTags,
      // "Deliver to [ZIP]" under the add to cart, from the delivery-estimate route
      "product.addToCart": DeliveryEstimate,
    },
    transforms: {
      // listings: the promoted SKUs first
      "productList.data": pinPromoted,
      // the added-to-cart popup: the quantity the cart really got (case packs)
      "addToCart.notificationData": popupQuantity,
    },
    widgets: {
      // "Your account manager" card for the page builder
      SppAccountManager: { render: AccountManager, ...ACCOUNT_MANAGER_EDITOR },
      // "Request a quote": posts to the store's /api/contact-us, which this plugin replaces (row 099)
      SppQuoteRequest: { render: QuoteRequest, ...QUOTE_REQUEST_EDITOR },
    },
  };
}
