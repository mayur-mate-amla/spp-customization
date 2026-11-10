import Image from "next/image";
import Link from "next/link";
import { getHighlights } from "./data.js";

// A whole page at a new URL, /spp-customization-welcome (server.tsx serverPages and znode-package.json "serverPages"): an async
// server component that awaits its data and renders into the page's HTML, inside the store's layout.

export async function WelcomePage(props: { storeCode: string }) {
  const highlights = await getHighlights(props.storeCode);
  return (
    <section className="spp-customization-welcome" data-test-selector="divWelcomePage">
      <Image src="/api/extensions/files/spp-customization-hero.svg" alt="" width={1280} height={360} priority className="spp-customization-hero__image" />
      <h1 className="spp-customization-welcome__title">Welcome to Spp Customization</h1>
      <ul className="spp-customization-welcome__list">
        {highlights.map((item) => (
          <li key={item.id} data-test-selector={`divHighlight${item.id}`}>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
      <Link href="/" className="spp-customization-hero__button">
        Start shopping
      </Link>
    </section>
  );
}
