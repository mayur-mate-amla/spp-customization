// Read or change this package's entry in the store's plugins.json, the way `znode install` writes it: under the
// folder's lock, with the previous registry copied to .history/ and the new one renamed into place.
//   node scripts/registry.mjs show                         this package's entry (version, enabled, stores, settings)
//   node scripts/registry.mjs set announcement="Hello"     one setting (JSON values: true, 12, "text"; else a string)
//   node scripts/registry.mjs enable true|false            switch it on or off
//   node scripts/registry.mjs stores StoreA,StoreB         the stores it runs for ("" for none)
// The plugin folder: RUNTIME_PLUGINS_DIR, else znode.local.json's pluginsDir. Only this package's entry is changed.
import fs from "node:fs";
import path from "node:path";

const name = JSON.parse(fs.readFileSync("znode-package.json", "utf8")).name;
const dir = process.env.RUNTIME_PLUGINS_DIR || (fs.existsSync("znode.local.json") && JSON.parse(fs.readFileSync("znode.local.json", "utf8")).pluginsDir);
if (!dir) throw new Error("no plugin folder: set RUNTIME_PLUGINS_DIR or znode.local.json");
const file = path.join(dir, "plugins.json");
const [command, value] = process.argv.slice(2);

const read = () => JSON.parse(fs.readFileSync(file, "utf8"));
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

// the same lock and history as the SDK's install (node_modules/znode-plugin/lib/znode-package.mjs)
const lock = path.join(dir, ".plugins.lock");
for (let tries = 0; ; tries++) {
  try {
    fs.mkdirSync(lock);
    break;
  } catch (error) {
    if (error.code !== "EEXIST" || tries > 400) throw error;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
}
try {
  const registry = read();
  const entry = entryOf(registry);
  if (command === "set") {
    const at = String(value || "").indexOf("=");
    if (at < 1) throw new Error('usage: set key=value');
    const key = value.slice(0, at);
    const raw = value.slice(at + 1);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    entry.settings = { ...(entry.settings || {}), [key]: parsed };
  } else if (command === "enable") {
    entry.enabled = value === "true";
  } else if (command === "stores") {
    entry.stores = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  } else {
    throw new Error(`unknown command ${command}`);
  }
  const history = path.join(dir, ".history");
  fs.mkdirSync(history, { recursive: true });
  fs.copyFileSync(file, path.join(history, `plugins-${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}.json`));
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(registry, null, 2) + "\n");
  fs.renameSync(temp, file);
  show(entry);
} finally {
  fs.rmSync(lock, { recursive: true, force: true });
}
