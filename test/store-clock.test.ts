// The theme's warehouse clock (src/server/): shipping cutoff, customer service hours, dated notice. All in the
// warehouse's time zone, whatever the server's or the shopper's.
import { describe, expect, it } from "vitest";
import { shippingCutoffAt } from "../src/server/shipping";
import { supportStatusAt } from "../src/server/status";
import { datedNotice, today } from "../src/server/notice";

const NY = "America/New_York";
// Wednesday 2026-11-11, 12:48 in New York (17:48 UTC)
const wednesdayNoon = new Date("2026-11-11T17:48:00Z");

describe("shippingCutoffAt", () => {
  it("counts down to the cutoff on a weekday", () => {
    expect(shippingCutoffAt(wednesdayNoon, 15, NY)).toEqual({ shipsToday: true, minutesLeft: 132, shipDay: "today", label: "Order within 2h 12m to ship today" });
  });
  it("ships tomorrow after the cutoff, Monday from Friday evening", () => {
    expect(shippingCutoffAt(new Date("2026-11-11T21:00:00Z"), 15, NY).label).toBe("Order now, ships tomorrow");
    expect(shippingCutoffAt(new Date("2026-11-13T22:00:00Z"), 15, NY).label).toBe("Order now, ships Monday");
  });
  it("uses the warehouse's zone, not UTC", () => {
    // 01:00 UTC Thursday is still Wednesday 20:00 in New York: after the cutoff, ships tomorrow (Thursday)
    expect(shippingCutoffAt(new Date("2026-11-12T01:00:00Z"), 15, NY).shipDay).toBe("tomorrow");
  });
});

describe("supportStatusAt", () => {
  it("is open during weekday hours", () => {
    expect(supportStatusAt(wednesdayNoon, 8, 18, NY, "1-800-555-0199")).toEqual({ open: true, label: "Customer service open until 6pm", phone: "1-800-555-0199" });
  });
  it("names the next opening: later today, tomorrow, or Monday", () => {
    expect(supportStatusAt(new Date("2026-11-11T11:00:00Z"), 8, 18, NY, "").label).toBe("Customer service opens today at 8am");
    expect(supportStatusAt(new Date("2026-11-11T23:30:00Z"), 8, 18, NY, "").label).toBe("Customer service opens tomorrow at 8am");
    expect(supportStatusAt(new Date("2026-11-14T15:00:00Z"), 8, 18, NY, "").label).toBe("Customer service opens Mon at 8am");
  });
});

describe("datedNotice", () => {
  const settings = { noticeText: " Holiday shipping ", noticeFrom: "2026-11-01", noticeUntil: "2026-12-26" };

  it("shows the notice between its dates, inclusive", () => {
    expect(datedNotice(settings, "2026-11-01")).toBe("Holiday shipping");
    expect(datedNotice(settings, "2026-12-26")).toBe("Holiday shipping");
  });
  it("hides it outside them, and without text", () => {
    expect(datedNotice(settings, "2026-10-31")).toBe("");
    expect(datedNotice(settings, "2026-12-27")).toBe("");
    expect(datedNotice({ ...settings, noticeText: "" }, "2026-11-11")).toBe("");
  });
  it("takes today's date on the warehouse's calendar, and survives a bad zone", () => {
    expect(today(NY, new Date("2026-11-12T03:00:00Z"))).toBe("2026-11-11");
    expect(today("Not/AZone", new Date("2026-11-12T03:00:00Z"))).toBe("2026-11-12");
  });
});
