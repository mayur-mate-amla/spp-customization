// Cart rules of the spp-commerce plugin, kept apart from the hooks so they can be tested with node alone.
// Each takes a SKU map from the plugin's settings ({ "<sku>": <number> }); SKUs match case-insensitively.

function forSku(map: Record<string, unknown>, sku: string) {
  const key = Object.keys(map).find((name) => name.toUpperCase() === sku.toUpperCase());
  const value = key === undefined ? NaN : Number(map[key]);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/** The per-order limit a line is over (setting orderLimits), or 0 when it is within it or has none. */
export function overLimit(sku: string, quantity: number, limits: Record<string, unknown>) {
  const max = forSku(limits, sku);
  return max && quantity > max ? max : 0;
}
