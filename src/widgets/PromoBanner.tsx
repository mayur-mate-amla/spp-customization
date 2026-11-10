import Link from "next/link";

// SppPromoBanner: a promotion banner the merchandiser fully controls from the page builder, using every kind of editor
// field: text (headline), textarea (offer details), number (discount), select (style), radio (alignment), list (perks),
// object (the button: label + link) and a custom field (a brand-color swatch picker drawn by the theme).

type IPromoBannerProps = {
  id?: string;
  headline?: string;
  details?: string;
  discount?: number | string;
  style?: "brand" | "dark" | "light";
  align?: "left" | "center";
  perks?: { text?: string }[];
  button?: { label?: string; url?: string };
  accent?: string;
};

// the brand colors the custom field offers (a free color would let a banner leave the brand)
const SWATCHES = [
  { name: "SPP orange", value: "#f26b1d" },
  { name: "Navy", value: "#0b2545" },
  { name: "Steel blue", value: "#134074" },
  { name: "Forest", value: "#166534" },
  { name: "Berry", value: "#9f1239" },
];

export function PromoBanner(props: IPromoBannerProps) {
  const discount = Number(props.discount) || 0;
  const perks = (props.perks || []).map((perk) => perk?.text).filter(Boolean);
  const accent = SWATCHES.some((swatch) => swatch.value === props.accent) ? props.accent : undefined;
  return (
    <section
      className={`spp-customization-promo spp-customization-promo--${props.style || "brand"} spp-customization-promo--${props.align || "left"}`}
      style={accent && props.style === "brand" ? { background: accent } : undefined}
      data-test-selector={`divPromoBanner${props.id || ""}`}
    >
      {discount > 0 && <span className="spp-customization-promo__badge">{discount}% off</span>}
      <div className="spp-customization-promo__text">
        {props.headline && <h2 className="spp-customization-promo__headline">{props.headline}</h2>}
        {props.details && <p className="spp-customization-promo__details">{props.details}</p>}
        {perks.length > 0 && (
          <ul className="spp-customization-promo__perks">
            {perks.map((perk, index) => (
              <li key={index}>{perk}</li>
            ))}
          </ul>
        )}
      </div>
      {props.button?.label && props.button?.url && (
        <Link href={props.button.url} className="spp-customization-promo__button" data-test-selector="linkPromoBanner">
          {props.button.label}
        </Link>
      )}
    </section>
  );
}

// the custom field: brand swatches as buttons (Puck "custom" field: render gets value and onChange)
function SwatchPicker(props: { value?: string; onChange: (value: string) => void; readOnly?: boolean }) {
  return (
    <div className="spp-customization-swatches" role="radiogroup" aria-label="Banner color">
      {SWATCHES.map((swatch) => (
        <button
          key={swatch.value}
          type="button"
          role="radio"
          aria-checked={props.value === swatch.value}
          aria-label={swatch.name}
          title={swatch.name}
          disabled={props.readOnly}
          className="spp-customization-swatches__swatch"
          style={{ background: swatch.value, outline: props.value === swatch.value ? "3px solid #0b2545" : "none", outlineOffset: 2 }}
          onClick={() => props.onChange(swatch.value)}
        />
      ))}
    </div>
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
        { label: "Brand (color below)", value: "brand" },
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
    accent: {
      type: "custom",
      label: "Banner color (brand style)",
      render: ({ value, onChange, readOnly }: { value?: string; onChange: (value: string) => void; readOnly?: boolean }) => (
        <div>
          <p className="spp-customization-swatches__label">Banner color (brand style)</p>
          <SwatchPicker value={value} onChange={onChange} readOnly={readOnly} />
        </div>
      ),
    },
    perks: {
      type: "array",
      label: "Perks (list)",
      arrayFields: { text: { type: "text", label: "Perk" } },
      defaultItemProps: { text: "New perk" },
      getItemSummary: (item: { text?: string }, index = 0) => item?.text || `Perk ${index + 1}`,
    },
    button: {
      type: "object",
      label: "Button",
      objectFields: {
        label: { type: "text", label: "Label" },
        url: { type: "text", label: "Link" },
      },
    },
  },
  defaultProps: {
    headline: "Back-to-work sale",
    details: "Save on drinkware, bags and apparel for your team. Ends Sunday.",
    discount: 20,
    style: "brand",
    align: "left",
    accent: "#f26b1d",
    perks: [{ text: "Free logo setup" }, { text: "Ships in 5 days" }],
    button: { label: "Shop the sale", url: "/category/1674" },
  },
};
