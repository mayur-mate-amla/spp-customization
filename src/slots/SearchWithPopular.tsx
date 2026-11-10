import type { ReactNode } from "react";
import Link from "next/link";
import { settings } from "../lib/host.js";

// Slot header.search: the store's own search box (children, kept as it is) with "Popular searches" links under it on
// desktop, as large catalogs do to help buyers start. The terms come from the popularSearches setting (a list the
// merchant edits); each link runs the store's normal search. The store renders the search box once for desktop and
// once for phones (props.isMobile): the links go with the desktop one only.

const DEFAULT_TERMS = ["Cordless drill", "Safety glasses", "Work gloves", "Extension cord"];

export function SearchWithPopular(props: { children?: ReactNode; isMobile?: boolean }) {
  const configured = Array.isArray(settings.popularSearches) ? (settings.popularSearches as unknown[]).map(String).filter(Boolean) : [];
  const terms = (configured.length ? configured : DEFAULT_TERMS).slice(0, 5);
  if (props.isMobile || !terms.length) return <>{props.children}</>;
  return (
    <div className="spp-customization-search" data-test-selector="divSearchWithPopular">
      {props.children}
      <nav className="spp-customization-search__popular" aria-label="Popular searches">
        <span className="spp-customization-search__label">Popular:</span>
        {terms.map((term) => (
          <Link key={term} href={`/search?SearchTerm=${encodeURIComponent(term)}`} className="spp-customization-search__term" data-test-selector={`linkPopularSearch-${term.replace(/\W+/g, "")}`}>
            {term}
          </Link>
        ))}
      </nav>
    </div>
  );
}
