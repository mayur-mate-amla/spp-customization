// One-command rollback: reinstall an older version of this package into the store's plugin folder.
//   npm run rollback               lists the versions kept on disk
//   npm run rollback -- 1.0.0      installs that version (the store's enabled flag, stores and settings are kept)
// Versions come from <plugin folder>/.versions/<name>/ (every npm run deploy keeps its zip there), else this
// project's releases/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { installedVersion, keepPreviousBrowserFiles, name, pluginsDir, versionsDir } from "./lib/store.mjs";

const places = [versionsDir(pluginsDir()), "releases"];
const versions = new Map();
for (const place of [...places].reverse()) {
  if (!fs.existsSync(place)) continue;
  for (const file of fs.readdirSync(place)) {
    if (file.startsWith(`${name}-`) && file.endsWith(".zpkg.zip")) versions.set(file.slice(name.length + 1, -".zpkg.zip".length), path.join(place, file));
  }
}
const version = process.argv[2];
if (!version) {
  console.log(versions.size ? `versions on disk:\n${[...versions].map(([v, file]) => `  ${v}  (${file})`).join("\n")}` : "no versions on disk");
  console.log("usage: npm run rollback -- <version>");
  process.exit(0);
}
const zip = versions.get(version);
if (!zip) {
  console.error(`version ${version} is not on disk; kept: ${[...versions.keys()].join(", ") || "none"}`);
  process.exit(1);
}
const previous = installedVersion(name);
const result = spawnSync(`npx znode install "${zip}"`, { stdio: "inherit", shell: true });
if (result.status !== 0) process.exit(result.status ?? 1);
// zero downtime (row 173): pages served just before the rollback still name the version rolled back from
const { kept, removed } = keepPreviousBrowserFiles(name, version, previous);
if (kept.length) console.log(`kept the previous version's browser files for pages served before the rollback: ${kept.join(", ")}`);
if (removed.length) console.log(`removed older versions' browser files: ${removed.join(", ")}`);
