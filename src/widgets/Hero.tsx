import { asset } from "../lib/assets.js";
import Image from "next/image";
import Link from "next/link";

// SppCustomizationHero: a page-builder block. HERO_EDITOR names it, gives its fields and the values a new block starts with;
// the merchant drops it on a page and fills them in. next/image and next/link are the store's own (its images config,
// its router). Render the same thing on the server and in the browser: no Date.now() or window during render.

type IHeroProps = { id?: string; heading?: string; text?: string; image?: string; buttonText?: string; buttonUrl?: string };

export function Hero(props: IHeroProps) {
  return (
    <section className="spp-customization-hero" data-test-selector={`divHero${props.id || ""}`}>
      {props.image && <Image src={props.image} alt="" width={1280} height={360} className="spp-customization-hero__image" priority />}
      <div className="spp-customization-hero__text">
        {props.heading && <h2 className="spp-customization-hero__heading">{props.heading}</h2>}
        {props.text && <p>{props.text}</p>}
        {props.buttonText && props.buttonUrl && (
          <Link href={props.buttonUrl} className="spp-customization-hero__button" data-test-selector="linkHero">
            {props.buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}

export const HERO_EDITOR = {
  label: "Spp Customization Hero",
  category: "SPP · Content",
  fields: {
    heading: { type: "text", label: "Heading" },
    text: { type: "textarea", label: "Text" },
    image: { type: "text", label: "Image URL" },
    buttonText: { type: "text", label: "Button text" },
    buttonUrl: { type: "text", label: "Button link" },
  },
  defaultProps: {
    heading: "Made for your business",
    text: "Tell buyers what makes this store worth their time.",
    image: asset("spp-customization-hero.svg"),
    buttonText: "Shop now",
    buttonUrl: "/",
  },
};
