import type { IPluginRouteContext, IPluginRouteRequest } from "znode-plugin/types/extension-api";
import { datedNotice, today } from "./notice.js";
import { shippingCutoffAt, type IShippingCutoff } from "./shipping.js";

// GET /api/extensions/plugins/spp-customization/store-status: the theme's own BFF API (row 094). One call answers what
// the header needs about the store right now, from the store's settings and the warehouse clock, so the browser makes
// one request instead of three and never does the time-zone math itself:
//   { support: { open, label, phone }, shipping: { shipsToday, minutesLeft, shipDay, label }, notice, date, timeZone }
// Public (no shopper data); cached by the browser for a minute.

export interface ISupportStatus {
  open: boolean;
  label: string;
  phone: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabel = (hour: number) => `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;

function zonedNow(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { weekday: DAYS.indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Whether customer service is open at `now` (weekdays, openHour to closeHour in the warehouse's zone), and what to say. */
export function supportStatusAt(now: Date, openHour: number, closeHour: number, timeZone: string, phone: string): ISupportStatus {
  const { weekday, minutes } = zonedNow(now, timeZone);
  const weekdayOpen = weekday >= 1 && weekday <= 5;
  if (weekdayOpen && minutes >= openHour * 60 && minutes < closeHour * 60) return { open: true, label: `Customer service open until ${hourLabel(closeHour)}`, phone };
  // the next opening: later today, else the next weekday
  let day = weekday;
  let later = weekdayOpen && minutes < openHour * 60;
  while (!later) {
    day = (day + 1) % 7;
    later = day >= 1 && day <= 5;
  }
  const when = day === weekday ? "today" : day === (weekday + 1) % 7 ? "tomorrow" : DAYS[day];
  return { open: false, label: `Customer service opens ${when} at ${hourLabel(openHour)}`, phone };
}

const intSetting = (value: unknown, fallback: number, max: number) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= max ? number : fallback;
};

export async function storeStatus(_request: IPluginRouteRequest, context: IPluginRouteContext) {
  const settings = context.settings;
  let timeZone = String(settings.shipTimezone || "America/New_York");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    timeZone = "America/New_York";
  }
  const now = new Date();
  const support = supportStatusAt(now, intSetting(settings.supportOpenHour, 8, 23), intSetting(settings.supportCloseHour, 18, 24), timeZone, String(settings.supportPhone || ""));
  const shipping: IShippingCutoff = shippingCutoffAt(now, intSetting(settings.shipCutoffHour, 15, 23), timeZone);
  const date = today(timeZone, now);
  return new Response(JSON.stringify({ support, shipping, notice: datedNotice(settings, date), date, timeZone }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
}
