// Shared by the scripts: this package's name and version, the store's plugin folder, and the registry lock.
import fs from "node:fs";
import path from "node:path";

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
