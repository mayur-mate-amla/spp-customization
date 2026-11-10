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

/** The minimum order quantity a line is under (setting minimums), or 0 when it meets it or has none. */
export function belowMinimum(sku: string, quantity: number, minimums: Record<string, unknown>) {
  const min = forSku(minimums, sku);
  return min && quantity > 0 && quantity < min ? min : 0;
}

/** The quantity a line must have by the quantity rules (a minimum first, then a limit), with the rule's name; null when it already does. */
export function quantityRule(sku: string, quantity: number, minimums: Record<string, unknown>, limits: Record<string, unknown>) {
  const min = belowMinimum(sku, quantity, minimums);
  if (min) return { quantity: min, rule: `minimum ${min}` };
  const max = overLimit(sku, quantity, limits);
  if (max) return { quantity: max, rule: `limit ${max} per order` };
  return null;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** The notes a cart line gets (setting casePacks, minimums and orderLimits): shown under the line on the cart page and checkout. */
export function lineNotes(sku: string, casePacks: Record<string, unknown>, limits: Record<string, unknown>, minimums: Record<string, unknown> = {}) {
  const notes: string[] = [];
  const pack = forSku(casePacks, sku);
  if (pack > 1) notes.push(`Sold in cases of ${pack}`);
  const min = forSku(minimums, sku);
  if (min > 1) notes.push(`Minimum order ${min}`);
  const max = forSku(limits, sku);
  if (max) notes.push(`Limit ${max} per order`);
  return notes;
}

/** The line's description (Znode's HTML) with the notes after it; the same description when there are none. */
export function withNotes(description: unknown, notes: string[]) {
  const html = typeof description === "string" ? description : "";
  if (!notes.length || html.includes("spp-line-notes")) return html;
  return `${html}<ul class="spp-line-notes">${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`;
}

type ILine = { id: string; sku: string; quantity: number };
export type ICompanionChange = { add?: { sku: string; quantity: number; for: string }; remove?: { lineId: string; sku: string; for: string } };

/**
 * What the companion rule (setting companions: { "<sku>": "<companion sku>" }) changes in a cart: a companion is added
 * when its item is in the cart and it is not (its quantity: the item's, rounded up to the companion's case pack), and
 * the companions this rule added are removed once their item has left the cart. `added` is what the rule added to
 * this cart before (companion SKU -> item SKU); a companion the shopper added is never removed.
 */
export function companionChanges(lines: ILine[], companions: Record<string, unknown>, added: Record<string, string>, casePacks: Record<string, unknown>) {
  const inCart = (sku: string) => lines.find((line) => line.sku.toUpperCase() === sku.toUpperCase());
  const changes: ICompanionChange[] = [];
  for (const [item, companion] of Object.entries(companions)) {
    if (typeof companion !== "string" || !companion) continue;
    const line = inCart(item);
    if (line && !inCart(companion)) {
      const pack = forSku(casePacks, companion);
      const quantity = pack > 1 ? Math.ceil(line.quantity / pack) * pack : line.quantity;
      changes.push({ add: { sku: companion, quantity, for: item } });
    }
  }
  for (const [companion, item] of Object.entries(added)) {
    const line = inCart(companion);
    if (line && !inCart(item)) changes.push({ remove: { lineId: line.id, sku: companion, for: item } });
  }
  return changes;
}

/** The quantity an add really puts in the cart: rounded up to the SKU's case pack (setting casePacks), as beforeAddToCart does. */
export function caseQuantity(sku: string, quantity: number, casePacks: Record<string, unknown>) {
  const pack = forSku(casePacks, sku);
  return pack > 1 && quantity > 0 ? Math.ceil(quantity / pack) * pack : quantity;
}

/** The products with the pinned SKUs first, in the pinned order; the others after them in the order they came. */
export function pinFirst<T extends { sku?: string }>(products: T[], pinned: unknown[]) {
  const order = pinned.map((sku) => String(sku).toUpperCase());
  const rank = (product: T) => {
    const index = order.indexOf(String(product.sku || "").toUpperCase());
    return index === -1 ? order.length : index;
  };
  return products.map((product, index) => ({ product, index })).sort((a, b) => rank(a.product) - rank(b.product) || a.index - b.index).map(({ product }) => product);
}
