// Read or change a package's entry in the store's plugins.json, the way `znode install` writes it: under the folder's
// lock, with the previous registry copied to .history/ and the new one renamed into place.
//   node scripts/registry.mjs show                         this package's entry (version, enabled, stores, settings)
//   node scripts/registry.mjs set announcement="Hello"     one setting (JSON values: true, 12, "text"; else a string)
//   node scripts/registry.mjs enable true|false            switch it on or off for its stores
//   node scripts/registry.mjs stores StoreA,StoreB         the stores it runs for ("" for none, "*" for every store)
//   node scripts/registry.mjs themes StoreA                which themes are placed for a store, in the order the store
//                                                          picks them (the first enabled one is the store's theme)
//   node scripts/registry.mjs before redpanda              move this entry just before another: it comes first for the
//                                                          stores both are placed for (theme priority, a fallback)
//   ... --package redpanda                                 the same for another package's entry (store configuration)
// Per store (rows 154-157), as the store reads it (registry-index.ts, resolveStoreEntries):
//   node scripts/registry.mjs store StoreA                 everything a store gets: its theme chain and its plugins,
//                                                          in the order it applies them, with the settings that differ
//                                                          for that store (installation overrides)
//   node scripts/registry.mjs install StoreA[,StoreB] [key=value ...]
//                                                          an installation record: places the package on those stores
//                                                          with its own settings over the package's (registry v2
//                                                          "installations"). The first one also moves the entry's
//                                                          "stores" into installations, because a package with
//                                                          installations ignores its "stores"
//   node scripts/registry.mjs remove StoreA                takes the package off a store (its installation record)
// The plugin folder: RUNTIME_PLUGINS_DIR, else znode.local.json's pluginsDir.
import fs from "node:fs";
import path from "node:path";
import { changeRegistry, name as ownName, pluginsDir } from "./lib/store.mjs";

const dir = pluginsDir();
const args = process.argv.slice(2);
const at = args.indexOf("--package");
const name = at === -1 ? ownName : args[at + 1];
if (at !== -1) args.splice(at, 2);
const [command, value] = args;
const read = () => JSON.parse(fs.readFileSync(path.join(dir, "plugins.json"), "utf8"));
const entryOf = (registry) => {
  const entry = registry.plugins.find((item) => item.name === name);
  if (!entry) throw new Error(`${name} is not installed in ${dir}`);
  return entry;
};
const show = (entry) => {
  const installations = (read().installations || []).filter((item) => item.package === entry.name);
  console.log(JSON.stringify({ name: entry.name, version: entry.version, enabled: entry.enabled, stores: installations.length ? `(ignored: placed by its installations) ${JSON.stringify(entry.stores)}` : entry.stores, parent: entry.parent, settings: entry.settings, ...(installations.length ? { installations } : {}) }, null, 2));
};

if (!command || command === "show") {
  show(entryOf(read()));
  process.exit(0);
}
// Where each package is placed, as registry-index.ts reads it: a package with installation records is placed by them
// (each enabled one, on its store, its list or "*"), and its own "stores" is ignored; any other package by its "stores"
// (none or "*": every store). Returns a store's placements in registry order, each package once (a store's own
// placement before an every-store one), with that placement's settings overrides.
function placementsFor(registry, storeCode) {
  const lower = (text) => String(text).toLowerCase();
  const code = lower(storeCode);
  const installations = Array.isArray(registry.installations) ? registry.installations : [];
  const installed = new Set(installations.map((item) => lower(item.package)));
  const placed = [];
  registry.plugins.forEach((entry, order) => {
    if (installed.has(lower(entry.name))) {
      for (const item of installations.filter((record) => lower(record.package) === lower(entry.name) && record.enabled !== false)) {
        const stores = item.store === "*" || item.stores === "*" ? ["*"] : [...(item.store ? [item.store] : []), ...(Array.isArray(item.stores) ? item.stores : [])];
        if (stores.some((store) => lower(store) === code)) placed.push({ order, own: true, entry, overrides: item.settings });
        else if (stores.includes("*")) placed.push({ order, own: false, entry, overrides: item.settings });
      }
    } else if (!entry.stores || entry.stores === "*") placed.push({ order, own: false, entry });
    else if (Array.isArray(entry.stores) && entry.stores.some((store) => lower(store) === code)) placed.push({ order, own: true, entry });
  });
  placed.sort((a, b) => a.order - b.order || Number(b.own) - Number(a.own));
  const once = new Set();
  return placed.filter((item) => !once.has(item.entry) && once.add(item.entry));
}

if (command === "themes") {
  // a store's theme: the first theme entry, in registry order, that is placed for it (its code or every store) and on
  placementsFor(read(), value || "")
    .filter((item) => item.entry.kind === "theme")
    .forEach((item, index) => console.log(`${index + 1}. ${item.entry.name}${item.entry.parent ? ` (parent ${item.entry.parent})` : ""}: ${item.entry.enabled === false ? "off" : "on"}`));
  process.exit(0);
}

if (command === "store") {
  // everything one store gets, in the order the store applies it: the theme chain (root first), then the plugins
  const registry = read();
  const usable = placementsFor(registry, value || "").filter((item) => item.entry.enabled !== false);
  const theme = usable.find((item) => item.entry.kind === "theme");
  const chain = [];
  for (let current = theme?.entry; current && chain.length < 10 && !chain.some((item) => item.entry === current); ) {
    chain.unshift(current === theme.entry ? theme : { entry: current });
    current = current.parent ? registry.plugins.find((entry) => entry.kind === "theme" && entry.name.toLowerCase() === current.parent.toLowerCase()) : undefined;
  }
  const line = (item, role) => {
    const overrides = item.overrides && Object.keys(item.overrides).length ? `  settings for this store: ${JSON.stringify(item.overrides)}` : "";
    return `  ${role.padEnd(8)} ${`${item.entry.name}@${item.entry.version}`.padEnd(28)} ${item.own === false ? "(every store)" : ""}${overrides}`;
  };
  console.log(`${value}:`);
  chain.forEach((item, index) => console.log(line(item, index === chain.length - 1 ? "theme" : "parent")));
  if (!chain.length) console.log("  theme    (none: the store's own built-in theme)");
  usable.filter((item) => item.entry.kind !== "theme").forEach((item) => console.log(line(item, item.entry.kind)));
  process.exit(0);
}

const entry = changeRegistry(dir, (registry) => {
  const entry = entryOf(registry);
  if (command === "set") {
    const eq = String(value || "").indexOf("=");
    if (eq < 1) throw new Error("usage: set key=value");
    const raw = value.slice(eq + 1);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    entry.settings = { ...(entry.settings || {}), [value.slice(0, eq)]: parsed };
  } else if (command === "enable") {
    entry.enabled = value === "true";
  } else if (command === "stores") {
    entry.stores = value === "*" ? "*" : String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  } else if (command === "install" || command === "remove") {
    const stores = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!stores.length) throw new Error(`usage: ${command} StoreA[,StoreB]${command === "install" ? " [key=value ...]" : ""}`);
    registry.installations = Array.isArray(registry.installations) ? registry.installations : [];
    const mine = () => registry.installations.filter((item) => item.package === entry.name);
    // the first installation record: the stores the entry was placed on keep it (as records without overrides),
    // since the store stops reading "stores" for a package that has installation records
    if (!mine().length && Array.isArray(entry.stores)) {
      for (const store of entry.stores) registry.installations.push({ package: entry.name, store });
      if (entry.stores.length) console.error(`moved "stores" ${JSON.stringify(entry.stores)} into installation records`);
    }
    const lower = (text) => String(text).toLowerCase();
    // one record per store: drop this package's records for these stores (a record for a list keeps its other stores)
    registry.installations = registry.installations.flatMap((item) => {
      if (item.package !== entry.name) return [item];
      if (item.store && stores.some((store) => lower(store) === lower(item.store))) return [];
      if (Array.isArray(item.stores)) {
        const rest = item.stores.filter((code) => !stores.some((store) => lower(store) === lower(code)));
        return rest.length ? [{ ...item, stores: rest }] : [];
      }
      return [item];
    });
    if (command === "install") {
      const settings = {};
      for (const pair of args.slice(2)) {
        const eq = pair.indexOf("=");
        if (eq < 1) throw new Error(`not key=value: ${pair}`);
        try {
          settings[pair.slice(0, eq)] = JSON.parse(pair.slice(eq + 1));
        } catch {
          settings[pair.slice(0, eq)] = pair.slice(eq + 1);
        }
      }
      for (const store of stores) registry.installations.push({ package: entry.name, store, ...(Object.keys(settings).length ? { settings } : {}) });
    }
  } else if (command === "before") {
    // priority: move the entry just before another one, so it comes first for the stores both are placed for
    const other = registry.plugins.findIndex((item) => item.name === value);
    if (other === -1) throw new Error(`${value} is not installed`);
    registry.plugins.splice(registry.plugins.indexOf(entry), 1);
    registry.plugins.splice(registry.plugins.findIndex((item) => item.name === value), 0, entry);
  } else {
    throw new Error(`unknown command ${command}`);
  }
  return entry;
});
show(entry);
