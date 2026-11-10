import { useState } from "react";

// PromoCodeStrip, extended: the parent theme's (spp-base) "Promo code strip" widget type, with two more editor fields a
// real coupon needs: "Expires on" (the strip shows "Offer ends Dec 31" and hides itself after that day, so an expired
// code is never shown) and "Terms" (small print under the code). The parent's fields stay (the page builder merges
// them with these), and the strip keeps the parent's markup and look; a package that takes over a widget type renders
// it, so this component reproduces the parent's strip and adds the two parts.

type IStripProps = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value));

// "2026-12-31" -> Date at the end of that day (local), or null
function endOf(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59) : null;
}

export function PromoCodeStripPlus(props: IStripProps) {
  const [copied, setCopied] = useState(false);
  const id = text(props.id);
  const code = text(props.code);
  const ends = endOf(text(props.expiresOn));
  // hidden once expired (rendered the same on the server and in the browser: the date is the only input)
  if (ends && ends.getTime() < Date.now()) return null;
  const endsLabel = ends ? ends.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <section className="promo-code-strip-widget w-full max-w-[var(--content-max-width,1361px)] mx-auto" data-test-selector={`divPromoCodeStrip${id}`}>
      <div
        className="flex flex-col gap-5 items-start rounded-[20px] px-6 py-6 md:flex-row md:items-center md:justify-between md:min-h-[134px] md:px-10 md:py-8"
        style={{ background: text(props.background) || "#f7f7f7" }}
      >
        <div className="flex flex-col gap-2 text-black">
          <h3 className="m-0 text-[22px] leading-7 md:text-2xl md:leading-[30px] font-bold text-black" style={{ fontFamily: "var(--heading-font-family)" }}>
            {text(props.title)}
          </h3>
          <p className="m-0 text-base leading-6">
            <span>{text(props.text)} </span>
            <strong className="font-bold" style={{ color: text(props.codeColor) || "#000" }}>
              {code}
            </strong>
            <span> {text(props.suffix)}</span>
          </p>
          {endsLabel && (
            <p className="spp-customization-strip__ends" data-test-selector={`txtPromoCodeEnds${id}`}>
              Offer ends {endsLabel}
            </p>
          )}
          {text(props.terms) && <p className="spp-customization-strip__terms">{text(props.terms)}</p>}
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 w-full sm:w-auto sm:px-14 md:w-[333px] h-[56px] md:h-[70px] rounded-[40px] border-0 text-[18px] md:text-[20.8px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: text(props.buttonColor) || "var(--primary-btn-bg)" }}
          aria-label={`Copy Code: ${code}`}
          data-test-selector={`btnPromoCodeCopy${id}`}
        >
          <span aria-live="polite">{copied ? "Copied!" : text(props.buttonText) || "Copy Code"}</span>
        </button>
      </div>
    </section>
  );
}

// only the added fields: the page builder keeps the parent's (title, text, code, suffix, button text, colors)
export const PROMO_CODE_STRIP_EDITOR = {
  label: "Promo code strip",
  category: "SPP · Promotions",
  fields: {
    expiresOn: { type: "text", label: "Expires on (YYYY-MM-DD; hidden after that day)" },
    terms: { type: "textarea", label: "Terms (small print)" },
  },
  defaultProps: { expiresOn: "", terms: "" },
};
