// spp-commerce's cart rules (src/commerce/rules.ts): the logic behind its hooks, tested without a store.
import { describe, expect, it } from "vitest";
import {
  caseQuantity,
  companionChanges,
  lineNotes,
  noteLanguage,
  pinFirst,
  quantityRule,
  replacedBy,
  ruleFacts,
  shippingChoices,
  withNotes,
} from "../src/commerce/rules";

describe("quantity rules (minimums, then per-order limits)", () => {
  const minimums = { "817NK_25": 25 };
  const limits = { "817nk_25": 100, GLOVES: 5 };

  it("raises a line under its minimum to the minimum", () => {
    expect(quantityRule("817NK_25", 10, minimums, limits)).toEqual({ quantity: 25, rule: "minimum 25" });
  });
  it("lowers a line over its limit to the limit, SKUs matched case-insensitively", () => {
    expect(quantityRule("gloves", 9, minimums, limits)).toEqual({ quantity: 5, rule: "limit 5 per order" });
  });
  it("leaves a line within its rules, and a SKU without rules", () => {
    expect(quantityRule("817NK_25", 30, minimums, limits)).toBeNull();
    expect(quantityRule("OTHER", 1, minimums, limits)).toBeNull();
  });
  it("ignores settings that are not positive whole numbers", () => {
    expect(quantityRule("A", 1, { A: "ten" }, { A: -1 })).toBeNull();
    expect(quantityRule("A", 1, { A: 2.5 }, {})).toBeNull();
  });
});

describe("case packs", () => {
  it("rounds an add up to whole cases", () => {
    expect(caseQuantity("CUP", 11, { CUP: 10 })).toBe(20);
    expect(caseQuantity("CUP", 20, { CUP: 10 })).toBe(20);
  });
  it("leaves a SKU without a case pack, and a zero quantity, as they are", () => {
    expect(caseQuantity("PEN", 7, { CUP: 10 })).toBe(7);
    expect(caseQuantity("CUP", 0, { CUP: 10 })).toBe(0);
  });
});

describe("line notes", () => {
  const casePacks = { CUP: 10 };
  const limits = { CUP: 50 };
  const minimums = { CUP: 20 };

  it("states each rule a SKU has, in English or French", () => {
    expect(lineNotes("CUP", casePacks, limits, minimums)).toEqual(["Sold in cases of 10", "Minimum order 20", "Limit 50 per order"]);
    expect(lineNotes("CUP", casePacks, limits, minimums, "fr")).toEqual(["Vendu par cartons de 10", "Minimum 20 par commande", "Maximum 50 par commande"]);
    expect(ruleFacts("CUP", casePacks, limits, minimums).map((fact) => fact.rule)).toEqual(["casePack", "minimum", "limit"]);
  });
  it("picks the language from NEXT_LOCALE, English for anything else", () => {
    expect(noteLanguage("fr-FR")).toBe("fr");
    expect(noteLanguage("de-DE")).toBe("en");
    expect(noteLanguage(undefined)).toBe("en");
  });
  it("adds the notes after the description once, escaped", () => {
    const html = withNotes("<p>Mug</p>", ["Limit <5> per order"]);
    expect(html).toBe('<p>Mug</p><ul class="spp-line-notes"><li>Limit &#60;5&#62; per order</li></ul>');
    expect(withNotes(html, ["Limit 5 per order"])).toBe(html);
    expect(withNotes(null, [])).toBe("");
  });
});

describe("companions", () => {
  const companions = { MUG: "MUG-BOX" };

  it("adds a companion for an item, rounded to the companion's case pack", () => {
    const lines = [{ id: "1", sku: "MUG", quantity: 7 }];
    expect(companionChanges(lines, companions, {}, { "MUG-BOX": 5 })).toEqual([{ add: { sku: "MUG-BOX", quantity: 10, for: "MUG" } }]);
  });
  it("removes a companion it added once its item has left the cart", () => {
    const lines = [{ id: "2", sku: "MUG-BOX", quantity: 10 }];
    expect(companionChanges(lines, companions, { "MUG-BOX": "MUG" }, {})).toEqual([{ remove: { lineId: "2", sku: "MUG-BOX", for: "MUG" } }]);
  });
  it("never removes a companion the shopper added", () => {
    const lines = [{ id: "2", sku: "MUG-BOX", quantity: 1 }];
    expect(companionChanges(lines, companions, {}, {})).toEqual([]);
  });
});

describe("pinned products and replaced SKUs", () => {
  it("puts pinned SKUs first in the pinned order, the rest as they came", () => {
    const products = [{ sku: "A" }, { sku: "B" }, { sku: "C" }, { sku: "D" }];
    expect(pinFirst(products, ["c", "A"]).map((p) => p.sku)).toEqual(["C", "A", "B", "D"]);
  });
  it("follows a chain of replacements to its end and stops on a loop", () => {
    expect(replacedBy("A", { A: "B", B: "C" })).toBe("C");
    expect(replacedBy("A", { A: "B", B: "A" })).toBe("B");
    expect(replacedBy("C", { A: "B" })).toBe("");
  });
});

describe("shipping choices (row 117)", () => {
  const options = [
    { shippingName: "Ground", shippingCode: "GND" },
    { shippingName: "Overnight Air", shippingCode: "1DA" },
    { shippingName: "Free shipping", description: "next day", shippingTypeName: "FreeShipping" },
  ];

  it("drops rush methods when the cart has a decorated item, never free shipping", () => {
    const { kept, removed, decorated } = shippingChoices(options, ["LOGO-MUG", "PEN"], { "logo-mug": 5 }, ["overnight", "next day"]);
    expect(kept.map((o) => o.shippingName)).toEqual(["Ground", "Free shipping"]);
    expect(removed.map((o) => o.shippingName)).toEqual(["Overnight Air"]);
    expect(decorated).toEqual(["LOGO-MUG"]);
  });
  it("keeps every method for a cart without decorated items", () => {
    expect(shippingChoices(options, ["PEN"], { "LOGO-MUG": 5 }, ["overnight"]).removed).toEqual([]);
  });
});
