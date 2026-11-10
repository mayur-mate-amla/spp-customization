import type { IPluginRouteContext, IPluginRouteRequest } from "znode-plugin/types/extension-api";

// GET /api/extensions/plugins/spp-customization/shipping-cutoff: when the next order ships, from the store's daily
// dispatch cutoff (settings shipCutoffHour, 0-23, and shipTimezone, an IANA zone). Orders placed before the cutoff on
// a weekday ship that day; later ones on the next weekday. Answered on the server so every shopper sees the
// warehouse's clock, not their own.
//   { shipsToday: true,  minutesLeft: 192, label: "Order within 3h 12m to ship today" }
//   { shipsToday: false, minutesLeft: 0,   label: "Order now, ships Monday" }

export interface IShippingCutoff {
  shipsToday: boolean;
  minutesLeft: number;
  shipDay: string;
  label: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// the weekday, hour and minute of a moment in a time zone
function zoned(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { weekday: WEEKDAYS.indexOf(get("weekday")), hour: Number(get("hour")), minute: Number(get("minute")) };
}

export function shippingCutoffAt(now: Date, cutoffHour: number, timeZone: string): IShippingCutoff {
  const { weekday, hour, minute } = zoned(now, timeZone);
  const isWeekday = weekday >= 1 && weekday <= 5;
  const minutesLeft = cutoffHour * 60 - (hour * 60 + minute);
  if (isWeekday && minutesLeft > 0) {
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    return { shipsToday: true, minutesLeft, shipDay: "today", label: `Order within ${h ? `${h}h ` : ""}${m}m to ship today` };
  }
  // the next weekday after today
  let next = (weekday + 1) % 7;
  while (next === 0 || next === 6) next = (next + 1) % 7;
  const shipDay = next === (weekday + 1) % 7 ? "tomorrow" : WEEKDAYS[next];
  return { shipsToday: false, minutesLeft: 0, shipDay, label: `Order now, ships ${shipDay}` };
}

export async function shippingCutoff(_request: IPluginRouteRequest, context: IPluginRouteContext): Promise<IShippingCutoff> {
  const hour = Number(context.settings.shipCutoffHour);
  const cutoffHour = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 15;
  let timeZone = String(context.settings.shipTimezone || "America/New_York");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    timeZone = "America/New_York";
  }
  return shippingCutoffAt(new Date(), cutoffHour, timeZone);
}
