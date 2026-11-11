// Shared by the scripts: this package's name and version, the store's plugin folder, and the registry lock.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const manifest = JSON.parse(fs.readFileSync("znode-package.json", "utf8"));
export const name = manifest.name;

// the store's plugin folder, as the znode command finds it: RUNTIME_PLUGINS_DIR, else znode.local.json's pluginsDir
export function pluginsDir() {
  const dir = process.env.RUNTIME_PLUGINS_DIR || (fs.existsSync("znode.local.json") && JSON.parse(fs.readFileSync("znode.local.json", "utf8")).pluginsDir);
  if (!dir) throw new Error("no plugin folder: set RUNTIME_PLUGINS_DIR or znode.local.json");
  return dir;
}

// every packed version of this package kept next to the store: <plugin folder>/.versions/<name>/. The store serves
// only flat file names from its plugin folder, so nothing in this folder is ever sent to a browser.
export const versionsDir = (dir = pluginsDir()) => path.join(dir, ".versions", name);

// The registry lock, history copy and atomic write, the same as `znode install`
// (node_modules/znode-plugin/lib/znode-package.mjs): run change(registry) under the lock, then write it.
export function changeRegistry(dir, change) {
  const file = path.join(dir, "plugins.json");
  const lock = path.join(dir, ".plugins.lock");
  for (let tries = 0; ; tries++) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (error) {
      if (error.code !== "EEXIST" || tries > 1200) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try {
    const registry = JSON.parse(fs.readFileSync(file, "utf8"));
    const result = change(registry);
    const history = path.join(dir, ".history");
    fs.mkdirSync(history, { recursive: true });
    fs.copyFileSync(file, path.join(history, `plugins-${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}.json`));
    const temp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(temp, JSON.stringify(registry, null, 2) + "\n");
    fs.renameSync(temp, file);
    return result;
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

// Where each package is placed, as registry-index.ts reads it: a package with installation records is placed by them
// (each enabled one, on its store, its list or "*"), and its own "stores" is ignored; any other package by its "stores"
// (none or "*": every store). Returns a store's placements in registry order, each package once (a store's own
// placement before an every-store one), with that placement's settings overrides.
export function placementsFor(registry, storeCode) {
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

// Zero downtime (row 173): installing a version deletes the previous version's code, its browser bundle and stylesheet
// included. A page served a moment before the install still names those files, and its browser asks for them a moment
// after, so they would answer 404 and the page would show without the package's styles and scripts. After an install,
// put the previous version's browser files back from its kept zip (.versions/), and remove those of any version before
// it. The store serves them by file name, so they keep working; they are browser code only, no server part.
export function keepPreviousBrowserFiles(packageName, current, previous, dir = pluginsDir()) {
  const browserFile = (version) => new RegExp(`^${packageName.replace(/-/g, "\-")}-${version.replace(/\./g, "\.")}\.(browser\.mjs|css)$`);
  const anyVersion = new RegExp(`^${packageName.replace(/-/g, "\-")}-(\d+\.\d+\.\d+)\.(browser\.mjs|css)$`);
  const kept = [];
  const removed = [];
  if (previous && previous !== current) {
    const zip = path.join(dir, ".versions", packageName, `${packageName}-${previous}.zpkg.zip`);
    if (fs.existsSync(zip)) {
      const require = createRequire(path.resolve("node_modules/znode-plugin/package.json"));
      const AdmZip = require("adm-zip");
      for (const entry of new AdmZip(zip).getEntries()) {
        if (!browserFile(previous).test(entry.entryName)) continue;
        const target = path.join(dir, entry.entryName);
        if (!fs.existsSync(target)) fs.writeFileSync(target, entry.getData());
        kept.push(entry.entryName);
      }
    }
  }
  for (const file of fs.readdirSync(dir)) {
    const version = anyVersion.exec(file)?.[1];
    if (version && version !== current && version !== previous) {
      fs.rmSync(path.join(dir, file), { force: true });
      removed.push(file);
    }
  }
  return { kept, removed };
}

// the version of a package the registry has installed now ("" if none)
export function installedVersion(packageName, dir = pluginsDir()) {
  const registry = JSON.parse(fs.readFileSync(path.join(dir, "plugins.json"), "utf8"));
  return registry.plugins.find((entry) => entry.name === packageName)?.version || "";
}
