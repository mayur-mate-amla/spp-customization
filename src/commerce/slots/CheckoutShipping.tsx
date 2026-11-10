import { cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { shippingChoices } from "../rules.js";
import { settings } from "../host.js";

// Slot checkout.shippingOptions (spp-commerce, row 117): the store's shipping-method list (children, the store's own
// ShippingOptions element) rendered again with fewer methods: a cart with a decorated item (setting productionDays)
// cannot use a rush method (setting rushShipping), because its production days alone take longer. A note says why. The
// store's list keeps its own behavior (selection, saving the method, free shipping); only its shippingOptions prop
// changes. The cart's SKUs come from the plugin's my-order route.

type IOption = { shippingId?: number; shippingName?: string; shippingCode?: string; description?: string; shippingTypeName?: string };

const map = (key: string) => (settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {});

function useCartSkus() {
  const [skus, setSkus] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    fetch("/api/extensions/plugins/spp-commerce/my-order", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => live && Array.isArray(data?.skus) && setSkus(data.skus))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return skus;
}

export function CheckoutShipping(props: { children?: ReactNode; shippingOptions?: IOption[] }) {
  const t = useTranslations("Common.sppCommerce");
  const skus = useCartSkus();
  const options = Array.isArray(props.shippingOptions) ? props.shippingOptions : [];
  const { kept, removed } = shippingChoices(options, skus, map("productionDays"), Array.isArray(settings.rushShipping) ? settings.rushShipping : []);
  if (!removed.length || !isValidElement(props.children)) return <>{props.children}</>;
  return (
    <div className="spp-commerce-shipping" data-test-selector="divShippingRules">
      {cloneElement(props.children as ReactElement<{ shippingOptions?: IOption[] }>, { shippingOptions: kept })}
      <p className="spp-commerce-shipping__note" role="note">
        {t("rushUnavailable", { methods: removed.map((option) => option.description || option.shippingName || "").join(", ") })}
      </p>
    </div>
  );
}
