// SppPromoBanner: a promotion banner the merchandiser fully controls from the page builder: headline, offer details,
// discount, style and alignment. Each setting is a field in the editor's right-hand panel.

type IPromoBannerProps = {
  id?: string;
  headline?: string;
  details?: string;
  discount?: number | string;
  style?: "brand" | "dark" | "light";
  align?: "left" | "center";
};

export function PromoBanner(props: IPromoBannerProps) {
  const discount = Number(props.discount) || 0;
  return (
    <section
      className={`spp-customization-promo spp-customization-promo--${props.style || "brand"} spp-customization-promo--${props.align || "left"}`}
      data-test-selector={`divPromoBanner${props.id || ""}`}
    >
      {discount > 0 && <span className="spp-customization-promo__badge">{discount}% off</span>}
      <div className="spp-customization-promo__text">
        {props.headline && <h2 className="spp-customization-promo__headline">{props.headline}</h2>}
        {props.details && <p className="spp-customization-promo__details">{props.details}</p>}
      </div>
    </section>
  );
}

export const PROMO_BANNER_EDITOR = {
  label: "Promotion banner",
  category: "Spp Customization",
  fields: {
    headline: { type: "text", label: "Headline" },
    details: { type: "textarea", label: "Offer details" },
    discount: { type: "number", label: "Discount (%)", min: 0, max: 90 },
    style: {
      type: "select",
      label: "Style",
      options: [
        { label: "Brand (orange)", value: "brand" },
        { label: "Dark", value: "dark" },
        { label: "Light", value: "light" },
      ],
    },
    align: {
      type: "radio",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
      ],
    },
  },
  defaultProps: {
    headline: "Back-to-work sale",
    details: "Save on drinkware, bags and apparel for your team. Ends Sunday.",
    discount: 20,
    style: "brand",
    align: "left",
  },
};
