import Link from "next/link";
import { ruleFacts } from "./rules.js";

// /ordering-information (spp-commerce serverPages, and "serverPages" in spp-commerce.znode-package.json): the store's
// ordering policies as a page of its own: case packs, minimums, per-order limits, companion items, free shipping and
// the sales reps. Written from the same settings the cart enforces (rows 080-086), so the page and the cart never
// disagree, and rendered on the server: the whole page is in the HTML (search engines, no flash).

type ISettings = Record<string, unknown>;

const map = (settings: ISettings, key: string) => (settings[key] && typeof settings[key] === "object" ? (settings[key] as Record<string, unknown>) : {});
const RULE_TEXT = { casePack: (n: number) => `Sold in cases of ${n}`, minimum: (n: number) => `Minimum order ${n}`, limit: (n: number) => `Limit ${n} per order` };

export function OrderingInfoPage(props: { settings: ISettings; storeCode: string }) {
  const { settings } = props;
  const casePacks = map(settings, "casePacks");
  const minimums = map(settings, "minimums");
  const limits = map(settings, "orderLimits");
  const companions = map(settings, "companions");
  const reps = map(settings, "salesReps");
  const skus = [...new Set([...Object.keys(casePacks), ...Object.keys(minimums), ...Object.keys(limits)])].sort();
  const freeOver = Number(settings.freeShippingOver) || 0;

  return (
    <article className="spp-commerce-info" data-test-selector="divOrderingInformation">
      {/* the width is on this inner box: themes size the page content's direct children (redpanda: max-width 1290px) */}
      <div className="spp-commerce-info__body">
        <h1 className="spp-commerce-info__title">Ordering information</h1>
        <p className="spp-commerce-info__lead">How orders work on this store: quantities, limits, shipping and who to call.</p>

        {skus.length > 0 && (
          <section aria-labelledby="spp-info-quantities">
            <h2 id="spp-info-quantities">Quantities</h2>
            <table className="spp-commerce-info__table">
              <thead>
                <tr>
                  <th scope="col">Item #</th>
                  <th scope="col">Rule</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => (
                  <tr key={sku} data-test-selector={`rowOrderingRule${sku}`}>
                    <th scope="row">
                      <Link href={`/search?searchTerm=${encodeURIComponent(sku)}`}>{sku}</Link>
                    </th>
                    <td>{ruleFacts(sku, casePacks, limits, minimums).map((fact) => RULE_TEXT[fact.rule](fact.count)).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="spp-commerce-info__note">The cart applies these for you: quantities are rounded up to whole cases and brought within the minimum and limit.</p>
          </section>
        )}

        {Object.keys(companions).length > 0 && (
          <section aria-labelledby="spp-info-companions">
            <h2 id="spp-info-companions">Items that come together</h2>
            <ul>
              {Object.entries(companions).map(([item, companion]) => (
                <li key={item}>
                  Item # {item} is added with item # {String(companion)}; removing it removes the companion too.
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="spp-info-shipping">
          <h2 id="spp-info-shipping">Shipping</h2>
          <p>{freeOver > 0 ? `Orders of $${freeOver.toFixed(2)} or more ship free; the bar at the top of every page shows how close your order is.` : "Shipping is calculated at checkout."}</p>
        </section>

        {Object.keys(reps).length > 0 && (
          <section aria-labelledby="spp-info-reps">
            <h2 id="spp-info-reps">Your sales rep</h2>
            <p>Ordering through a rep? Use their link so your orders are credited to them:</p>
            <ul className="spp-commerce-info__reps">
              {Object.entries(reps).map(([code, name]) => (
                <li key={code}>
                  <strong>{String(name)}</strong>{" "}
                  <a href={`/api/extensions/plugins/spp-commerce/rep?code=${encodeURIComponent(code)}&to=/`}>Shop with {String(name).split(" ")[0]}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
