// Under the product page's add-to-cart: the facts B2B buyers check before ordering, from the product the store already
// loaded (no extra request): where it ships from, minimum / maximum order, typical lead time, stock, and the volume
// price breaks when the product has them (tierPriceList). Facts without a value are left out.

type ITier = { minQuantity?: number; maxQuantity?: number; price?: number; MinQuantity?: number; MaxQuantity?: number; Price?: number };
type IProduct = {
  defaultWarehouseName?: string;
  minimumQuantity?: string | number;
  maximumQuantity?: string | number;
  typicalLeadTime?: string | number;
  quantity?: number;
  currencySuffix?: string;
  tierPriceList?: ITier[];
};

export function ProductFacts(props: { product?: IProduct; isQuickView?: boolean }) {
  const product = props.product;
  if (!product || props.isQuickView) return null;
  const min = Number(product.minimumQuantity) || 0;
  const max = Number(product.maximumQuantity) || 0;
  const lead = product.typicalLeadTime ? `${product.typicalLeadTime} business days` : "";
  const money = (value?: number) => (typeof value === "number" ? `${product.currencySuffix || "$"}${value.toFixed(2)}` : "");
  const tiers = (product.tierPriceList || [])
    .map((tier) => ({ min: tier.minQuantity ?? tier.MinQuantity, max: tier.maxQuantity ?? tier.MaxQuantity, price: tier.price ?? tier.Price }))
    .filter((tier) => typeof tier.price === "number" && tier.min);
  const facts: [string, string][] = [
    ["Ships from", product.defaultWarehouseName || ""],
    ["In stock", typeof product.quantity === "number" ? `${product.quantity} units` : ""],
    ["Minimum order", min > 1 ? `${min} units` : min === 1 ? "1 unit, no minimum" : ""],
    ["Maximum per order", max && max < 9999 ? `${max} units` : ""],
    ["Typical lead time", lead],
  ].filter(([, value]) => value) as [string, string][];
  if (!facts.length && !tiers.length) return null;
  return (
    <section className="spp-customization-facts" aria-labelledby="spp-customization-facts-title" data-test-selector="divProductFacts">
      <h2 id="spp-customization-facts-title" className="spp-customization-facts__title">
        Key details
      </h2>
      <dl className="spp-customization-facts__list">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {tiers.length > 0 && (
        <table className="spp-customization-facts__tiers">
          <caption>Volume pricing</caption>
          <thead>
            <tr>
              <th scope="col">Quantity</th>
              <th scope="col">Price each</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={String(tier.min)}>
                <td>{tier.max ? `${tier.min} – ${tier.max}` : `${tier.min}+`}</td>
                <td>{money(tier.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
