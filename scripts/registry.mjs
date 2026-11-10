// Read or change this package's entry in the store's plugins.json, the way `znode install` writes it: under the
// folder's lock, with the previous registry copied to .history/ and the new one renamed into place.
//   node scripts/registry.mjs show                         this package's entry (version, enabled, stores, settings)
//   node scripts/registry.mjs set announcement="Hello"     one setting (JSON values: true, 12, "text"; else a string)
//   node scripts/registry.mjs enable true|false            switch it on or off
//   node scripts/registry.mjs stores StoreA,StoreB         the stores it runs for ("" for none)
// The plugin folder: RUNTIME_PLUGINS_DIR, else znode.local.json's pluginsDir. Only this package's entry is changed.
import fs from "node:fs";
import path from "node:path";
import { changeRegistry, name, pluginsDir } from "./lib/store.mjs";

const dir = pluginsDir();
const [command, value] = process.argv.slice(2);
const entryOf = (registry) => {
  const entry = registry.plugins.find((item) => item.name === name);
  if (!entry) throw new Error(`${name} is not installed in ${dir}`);
  return entry;
};
const show = (entry) => console.log(JSON.stringify({ name: entry.name, version: entry.version, enabled: entry.enabled, stores: entry.stores, parent: entry.parent, settings: entry.settings }, null, 2));

if (!command || command === "show") {
  show(entryOf(JSON.parse(fs.readFileSync(path.join(dir, "plugins.json"), "utf8"))));
  process.exit(0);
}

const entry = changeRegistry(dir, (registry) => {
  const entry = entryOf(registry);
  if (command === "set") {
    const at = String(value || "").indexOf("=");
    if (at < 1) throw new Error("usage: set key=value");
    const raw = value.slice(at + 1);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    entry.settings = { ...(entry.settings || {}), [value.slice(0, at)]: parsed };
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
