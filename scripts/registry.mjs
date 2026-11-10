// Read or change a package's entry in the store's plugins.json, the way `znode install` writes it: under the folder's
// lock, with the previous registry copied to .history/ and the new one renamed into place.
//   node scripts/registry.mjs show                         this package's entry (version, enabled, stores, settings)
//   node scripts/registry.mjs set announcement="Hello"     one setting (JSON values: true, 12, "text"; else a string)
//   node scripts/registry.mjs enable true|false            switch it on or off for its stores
//   node scripts/registry.mjs stores StoreA,StoreB         the stores it runs for ("" for none)
//   node scripts/registry.mjs themes StoreA                which themes are placed for a store, in the order the store
//                                                          picks them (the first enabled one is the store's theme)
//   ... --package redpanda                                 the same for another package's entry (store configuration)
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
const show = (entry) => console.log(JSON.stringify({ name: entry.name, version: entry.version, enabled: entry.enabled, stores: entry.stores, parent: entry.parent, settings: entry.settings }, null, 2));

if (!command || command === "show") {
  show(entryOf(read()));
  process.exit(0);
}
if (command === "themes") {
  // a store's theme: the first theme entry, in registry order, that is placed for it (its code or every store) and on
  const store = String(value || "").toLowerCase();
  read()
    .plugins.filter((entry) => entry.kind === "theme")
    .filter((entry) => !entry.stores || entry.stores === "*" || (Array.isArray(entry.stores) && entry.stores.some((code) => code.toLowerCase() === store)))
    .forEach((entry, index) => console.log(`${index + 1}. ${entry.name}${entry.parent ? ` (parent ${entry.parent})` : ""}: ${entry.enabled === false ? "off" : "on"}`));
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
    entry.stores = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  } else {
    throw new Error(`unknown command ${command}`);
  }
  return entry;
});
show(entry);
