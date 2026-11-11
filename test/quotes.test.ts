// spp-commerce's quote requests (src/commerce/quotes.ts, rows 099, 101, 167).
import { describe, expect, it } from "vitest";
import { MAX_COMMENTS, envelope, quotesFor, readQuoteRequest, type IQuoteRequest } from "../src/commerce/quotes";

const form = { firstName: " Ana ", lastName: "Ruiz", emailId: "ana@buyer.example", comments: "500 mugs with our logo", quantity: "500", neededBy: "2026-12-01", repCode: "jr" };
const reps = { JR: "Jordan Rivera", AK: "Alex Kim" };
const now = new Date("2026-11-11T08:30:00Z");

describe("readQuoteRequest", () => {
  it("takes a complete form, with the shopper's own rep", () => {
    const { request, error } = readQuoteRequest(form, reps, now);
    expect(error).toBeUndefined();
    expect(request).toMatchObject({ name: "Ana Ruiz", email: "ana@buyer.example", quantity: 500, neededBy: "2026-12-01", rep: "Jordan Rivera", at: "2026-11-11T08:30:00.000Z" });
    expect(request?.reference).toMatch(/^Q-2611110830-[A-Z0-9]{4}$/);
  });
  it("falls back to the store's first rep, then to customer service", () => {
    expect(readQuoteRequest({ ...form, repCode: "" }, reps, now).request?.rep).toBe("Jordan Rivera");
    expect(readQuoteRequest(form, {}, now).request?.rep).toBe("Customer service");
  });
  it("refuses a form without a name, a valid email or a need", () => {
    expect(readQuoteRequest({ ...form, lastName: "" }, reps).error).toBe("Please enter your first and last name.");
    expect(readQuoteRequest({ ...form, emailId: "ana@buyer" }, reps).error).toBe("Please enter a valid email address.");
    expect(readQuoteRequest({ ...form, comments: "   " }, reps).error).toBe("Please tell us what you need.");
    expect(readQuoteRequest("not an object", reps).error).toBeDefined();
  });
  it("refuses comments over the limit instead of cutting them (row 101)", () => {
    expect(readQuoteRequest({ ...form, comments: "x".repeat(MAX_COMMENTS + 1) }, reps).error).toContain("2,000 characters");
    expect(readQuoteRequest({ ...form, comments: "x".repeat(MAX_COMMENTS) }, reps).request?.comments).toHaveLength(MAX_COMMENTS);
  });
  it("keeps quantity and date within bounds", () => {
    expect(readQuoteRequest({ ...form, quantity: "-3" }, reps).request?.quantity).toBe(0);
    expect(readQuoteRequest({ ...form, quantity: 1e9 }, reps).request?.quantity).toBe(1_000_000);
    expect(readQuoteRequest({ ...form, neededBy: "next week" }, reps).request?.neededBy).toBe("");
  });
});

describe("quotesFor (row 167)", () => {
  const quote = (reference: string, email: string) => ({ reference, email }) as IQuoteRequest;
  const list = [quote("Q-1", "ana@buyer.example"), quote("Q-2", "ben@other.example"), quote("Q-3", "Ana@Buyer.Example")];

  it("gives a buyer their own requests only, any case", () => {
    expect(quotesFor(list, " ANA@buyer.example ").map((q) => q.reference)).toEqual(["Q-1", "Q-3"]);
  });
  it("gives nothing for an empty name or part of an address", () => {
    expect(quotesFor(list, "")).toEqual([]);
    expect(quotesFor(list, "buyer.example")).toEqual([]);
  });
});

it("answers in the store's envelope", () => {
  expect(envelope({ hasError: false }, "ok")).toEqual({ status: "success", message: "ok", data: { hasError: false } });
});
