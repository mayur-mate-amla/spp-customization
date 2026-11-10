// Delivery estimates for the product page's "Deliver to" box (route delivery-estimate, row 093).
// The ZIP's city and state come from a public ZIP API (zippopotam.us), asked on the store's server only (permission
// externalNetwork) and kept per ZIP for a day; the date is worked out here: ground transit from the warehouse's state
// by distance, counted in business days from the day the order ships (today before the cutoff, else the next business
// day). No shopper data but the ZIP leaves the store.

import { outboundJson } from "./outbound";

export type IPlace = { zip: string; city: string; state: string; lat: number; lon: number };

const WAREHOUSE = { state: "WI", lat: 43.05, lon: -87.9 }; // Milwaukee
const ZIP_API = "https://api.zippopotam.us/us/";
const places = new Map<string, { at: number; place: IPlace | null }>();
const DAY_MS = 24 * 60 * 60 * 1000;

/** City, state and position of a US ZIP, or null when there is no such ZIP. Throws when the ZIP API cannot be reached. */
export async function lookupZip(zip: string): Promise<IPlace | null> {
  const cached = places.get(zip);
  if (cached && Date.now() - cached.at < DAY_MS) return cached.place;
  // through the plugin's outbound rules: allowed host, 5 s, 64 KB (outbound.ts, row 096)
  const answer = await outboundJson<{ places?: { "place name"?: string; "state abbreviation"?: string; latitude?: string; longitude?: string }[] }>(`${ZIP_API}${zip}`);
  if (answer.status === 404) {
    places.set(zip, { at: Date.now(), place: null });
    return null;
  }
  if (answer.status !== 200) throw new Error(`ZIP API answered ${answer.status}`);
  const first = answer.data?.places?.[0];
  const place = first ? { zip, city: String(first["place name"] || ""), state: String(first["state abbreviation"] || ""), lat: Number(first.latitude), lon: Number(first.longitude) } : null;
  places.set(zip, { at: Date.now(), place });
  return place;
}

/** Ground transit days from the warehouse: 1 in its state, then by straight-line distance (2 to 5 days). */
export function transitDays(place: Pick<IPlace, "state" | "lat" | "lon">) {
  if (place.state === WAREHOUSE.state) return 1;
  const km = haversineKm(WAREHOUSE.lat, WAREHOUSE.lon, place.lat, place.lon);
  if (km < 500) return 2;
  if (km < 1200) return 3;
  if (km < 2200) return 4;
  return 5;
}

/** The day an order placed `now` arrives: it ships today before `cutoffHour` (warehouse time) on a weekday, else the next business day. */
export function arrivalDate(now: Date, days: number, cutoffHour = 14, timeZone = "America/Chicago") {
  const local = new Date(now.toLocaleString("en-US", { timeZone }));
  const ship = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const weekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
  if (weekend(ship) || local.getHours() >= cutoffHour) {
    do ship.setDate(ship.getDate() + 1);
    while (weekend(ship));
  }
  const arrive = new Date(ship);
  for (let left = days; left > 0; ) {
    arrive.setDate(arrive.getDate() + 1);
    if (!weekend(arrive)) left--;
  }
  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { shipsOn: iso(ship), arrivesBy: iso(arrive) };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
