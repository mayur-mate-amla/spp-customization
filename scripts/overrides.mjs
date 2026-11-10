// Which store API routes are taken over, on which store, by which plugin, read from the store's registry (plugins.json)
// the way the proxy decides it (route-overrides.server.ts findRouteOverride): an enabled plugin (never a theme) placed
// for the store, or for every store ("*"), with "overrides" naming the path; the first such entry in registry order
// wins, and a later one for the same path is shadowed.
//   npm run overrides                     every store named in the registry
//   npm run overrides -- POCSppDemo MaxwellsHardware
// Per-store installations or a previewed theme do not change this: themes never take over routes (row 040).
import fs from "node:fs";
import path from "node:path";
import { pluginsDir } from "./lib/store.mjs";

const registry = JSON.parse(fs.readFileSync(path.join(pluginsDir(), "plugins.json"), "utf8"));
const entries = Array.isArray(registry) ? registry : registry.plugins || [];
const placedFor = (entry, store) => {
  const stores = entry.stores;
  if (stores === "*" || (Array.isArray(stores) && stores.includes("*"))) return true;
  return Array.isArray(stores) && stores.some((code) => String(code).toLowerCase() === store.toLowerCase());
};

const named = [...new Set(entries.flatMap((entry) => (Array.isArray(entry.stores) ? entry.stores : [])).filter((code) => code !== "*"))].sort();
const stores = process.argv.slice(2).length ? process.argv.slice(2) : named;

for (const store of stores) {
  const taken = new Map();
  const lines = [];
  for (const entry of entries) {
    if (entry.kind === "theme" || !entry.overrides || typeof entry.overrides !== "object") continue;
    const active = entry.enabled !== false && placedFor(entry, store);
    for (const [route, target] of Object.entries(entry.overrides)) {
      const where = `/api/extensions/plugins/${entry.name}/${target}`;
      if (!active) lines.push(`  ${route}  (${entry.name}: ${entry.enabled === false ? "switched off" : "not placed for this store"})`);
      else if (taken.has(route)) lines.push(`  ${route}  (${entry.name}: shadowed by ${taken.get(route)})`);
      else {
        taken.set(route, entry.name);
        lines.push(`  ${route}  ->  ${where}`);
      }
    }
  }
  console.log(`${store}: ${taken.size ? `${taken.size} store route(s) taken over` : "the store's own routes only"}`);
  for (const line of lines) console.log(line);
}
