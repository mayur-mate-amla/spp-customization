import { useEffect, useState } from "react";

// SppHighlights: "Why order with us", a band of account benefits whose content is not in the page: it is loaded from
// the theme's server route (GET /api/extensions/plugins/spp-customization/highlights), where it comes from the store's
// data source (src/server/data.ts: a mock today, the Znode API in row 095). Base widgets such as the products carousel
// load their data on the server through an agent; a package widget renders in the browser, so it asks the package's
// own route, which runs on the store's server with the store's context and keeps the source (and any key) there.
// The merchant sets the heading and how many items to show; a skeleton shows while the route answers.

type IHighlight = { id: number; title: string; text: string };
type IHighlightsProps = { id?: string; heading?: string; limit?: number };

const ROUTE = "/api/extensions/plugins/spp-customization/highlights";

function useHighlights(limit: number) {
  const [state, setState] = useState<{ items: IHighlight[]; loading: boolean; failed: boolean }>({ items: [], loading: true, failed: false });
  useEffect(() => {
    let live = true;
    fetch(`${ROUTE}?limit=${limit}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => live && setState({ items: Array.isArray(data?.items) ? data.items : [], loading: false, failed: false }))
      .catch(() => live && setState({ items: [], loading: false, failed: true }));
    return () => {
      live = false;
    };
  }, [limit]);
  return state;
}

export function Highlights(props: IHighlightsProps) {
  const limit = Math.max(1, Math.min(6, Number(props.limit) || 3));
  const { items, loading, failed } = useHighlights(limit);
  // nothing to say (route down or no items): the band is left out rather than shown empty
  if (failed || (!loading && !items.length)) return null;
  return (
    <section className="spp-customization-highlights" data-test-selector={`divHighlights${props.id || ""}`} aria-busy={loading}>
      {props.heading && <h2 className="spp-customization-highlights__heading">{props.heading}</h2>}
      <ul className="spp-customization-highlights__list">
        {loading
          ? Array.from({ length: limit }, (_, index) => <li key={index} className="spp-customization-highlights__card spp-customization-highlights__card--loading" aria-hidden="true" />)
          : items.map((item, index) => (
              <li key={item.id} className="spp-customization-highlights__card" data-test-selector={`listItemHighlight${index}`}>
                <span className="spp-customization-highlights__number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="spp-customization-highlights__title">{item.title}</h3>
                <p className="spp-customization-highlights__text">{item.text}</p>
              </li>
            ))}
      </ul>
    </section>
  );
}

export const HIGHLIGHTS_EDITOR = {
  label: "Why order with us (live)",
  category: "SPP · Content",
  fields: {
    heading: { type: "text", label: "Heading" },
    limit: { type: "number", label: "Items to show (1-6)", min: 1, max: 6 },
  },
  defaultProps: { heading: "Why order with us", limit: 3 },
};
