// npm run uninstall: remove this package from the store's plugin folder cleanly: its plugins.json entry and every file
// it owns there, the installed version's and the leftovers of older versions (fonts, images, source maps). Files
// another package's entry names are never touched. The zips kept for rollback (.versions/) stay unless --purge.
//   npm run uninstall
//   npm run uninstall -- --purge
//   npm run uninstall -- --package spp-sandbox-probe [--purge]   another package of this repo (a test package)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { changeRegistry, name as ownName, pluginsDir } from "./lib/store.mjs";

const require = createRequire(path.resolve("node_modules/znode-plugin/package.json"));
const AdmZip = require("adm-zip");
const dir = pluginsDir();
const purge = process.argv.includes("--purge");
const at = process.argv.indexOf("--package");
const name = at === -1 ? ownName : process.argv[at + 1];
const versionsDir = (folder) => path.join(folder, ".versions", name);
const filesOf = (entry) =>
  [entry.file, entry.browser, entry.messages, ...(entry.styles || []), ...(entry.assets || []), ...Object.values(entry.pages || {})].filter(
    (item) => typeof item === "string" && item === path.basename(item)
  );

// the registry does not list a package's assets (images, fonts): take every file name from this package's own zips,
// the versions kept next to the store and this project's releases/
const zipNames = new Set();
for (const place of [versionsDir(dir), "releases"]) {
  if (!fs.existsSync(place)) continue;
  for (const file of fs.readdirSync(place).filter((item) => item.startsWith(`${name}-`) && item.endsWith(".zpkg.zip"))) {
    for (const entry of new AdmZip(path.join(place, file)).getEntries()) if (entry.entryName !== "znode-package.json") zipNames.add(entry.entryName);
  }
}

const removed = changeRegistry(dir, (registry) => {
  const entry = registry.plugins.find((item) => item.name === name);
  if (!entry) return null;
  registry.plugins = registry.plugins.filter((item) => item !== entry);
  if (Array.isArray(registry.installations)) registry.installations = registry.installations.filter((item) => item.package !== name);
  const others = new Set(registry.plugins.flatMap(filesOf));
  // the entry's files and their maps, every file of this package's zips, and older versions' files:
  // <name>-<semver>... (another package's name would continue with a letter, not a digit)
  const versioned = new RegExp(`^${name.replace(/-/g, "\\-")}-\\d+\\.\\d+\\.\\d+`);
  const owned = new Set([...filesOf(entry).flatMap((file) => [file, `${file}.map`]), ...zipNames]);
  const files = fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isFile() && (owned.has(file) || versioned.test(file)) && !others.has(file));
  for (const file of files) fs.rmSync(path.join(dir, file), { force: true });
  return { version: entry.version, files };
});

if (removed) {
  console.log(`uninstalled ${name}@${removed.version}: entry removed, ${removed.files.length} files deleted`);
  for (const file of removed.files) console.log(`  - ${file}`);
} else {
  console.log(`${name} is not installed in this plugin folder`);
}
if (purge && fs.existsSync(versionsDir(dir))) {
  fs.rmSync(versionsDir(dir), { recursive: true, force: true });
  console.log(`  - .versions/${name}/ (the kept versions)`);
} else if (fs.existsSync(versionsDir(dir))) {
  console.log(`kept for a reinstall or rollback: .versions/${name}/ (npm run uninstall -- --purge removes it)`);
}
