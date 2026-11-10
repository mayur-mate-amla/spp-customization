// /event-kits (spp-commerce serverPages, row 121): a module the store does not have. Ready-made kits for events (a
// trade-show booth, new hires), each a list of items and quantities from the eventKits setting. The server renders the
// whole page into the HTML (the kits, their contents, a button per kit); the plugin's browser part (EventKits.tsx, run
// from its layout.header slot on this page only) then fills in live names, prices and stock from the sku-lookup route
// and makes "Add kit to cart" work through the store's own add-to-cart. Without JavaScript the page still lists the
// kits.

export type IKit = { id: string; name: string; text?: string; items: { sku: string; quantity: number; label?: string }[] };

/** The kits from the setting, checked: an id, a name, and items with a SKU and a whole quantity. */
export function readKits(value: unknown): IKit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((kit) => {
    if (!kit || typeof kit !== "object") return [];
    const { id, name, text, items } = kit as Record<string, unknown>;
    const lines = (Array.isArray(items) ? items : []).flatMap((item) => {
      const { sku, quantity, label } = (item || {}) as Record<string, unknown>;
      const count = Math.floor(Number(quantity));
      return typeof sku === "string" && sku && count > 0 ? [{ sku, quantity: count, label: typeof label === "string" ? label : "" }] : [];
    });
    return typeof id === "string" && /^[a-z0-9-]+$/.test(id) && typeof name === "string" && lines.length ? [{ id, name, text: typeof text === "string" ? text : "", items: lines }] : [];
  });
}

export function EventKitsPage(props: { settings: Record<string, unknown> }) {
  const kits = readKits(props.settings.eventKits);
  return (
    <article className="spp-commerce-kits" data-test-selector="divEventKits">
      <div className="spp-commerce-kits__body">
        <h1 className="spp-commerce-kits__title">Event kits</h1>
        <p className="spp-commerce-kits__lead">Everything one event needs, in one click. Quantities follow each item&apos;s case pack; your rep can change any kit.</p>
        {kits.map((kit) => (
          <section key={kit.id} className="spp-commerce-kits__kit" aria-labelledby={`spp-kit-${kit.id}`} data-spp-kit={kit.id}>
            <h2 id={`spp-kit-${kit.id}`}>{kit.name}</h2>
            {kit.text && <p>{kit.text}</p>}
            <table className="spp-commerce-info__table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Each</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {kit.items.map((item) => (
                  <tr key={item.sku} data-spp-kit-line={kit.id} data-sku={item.sku} data-qty={item.quantity}>
                    <th scope="row">
                      <span data-spp-name>{item.label || item.sku}</span>
                      <small> · Item # {item.sku}</small>
                    </th>
                    <td>{item.quantity}</td>
                    <td data-spp-price>–</td>
                    <td data-spp-total>–</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    Kit total
                  </th>
                  <td data-spp-kit-total={kit.id}>–</td>
                </tr>
              </tfoot>
            </table>
            <div className="spp-commerce-kits__actions">
              <button type="button" data-spp-kit-add={kit.id} data-test-selector={`btnAddKit-${kit.id}`} disabled>
                Add kit to cart
              </button>
              <span role="status" aria-live="polite" data-spp-kit-status={kit.id} />
            </div>
          </section>
        ))}
        {!kits.length && <p>No kits are set up for this store yet.</p>}
      </div>
    </article>
  );
}
