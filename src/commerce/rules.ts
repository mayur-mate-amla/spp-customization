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

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** The notes a cart line gets (setting casePacks and orderLimits): shown under the line on the cart page and checkout. */
export function lineNotes(sku: string, casePacks: Record<string, unknown>, limits: Record<string, unknown>) {
  const notes: string[] = [];
  const pack = forSku(casePacks, sku);
  if (pack > 1) notes.push(`Sold in cases of ${pack}`);
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
