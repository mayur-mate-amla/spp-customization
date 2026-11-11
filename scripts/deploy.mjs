// npm run deploy [-- <package>]: `znode deploy` (build, pack, install into the store's plugin folder), then keep the
// packed version next to the store in <plugin folder>/.versions/<name>/, so every deployed version stays on disk for a
// rollback (npm run rollback), whichever machine deployed it. The install itself removes the previous version's code.
//   npm run deploy                                         the theme (znode-package.json)
//   npm run deploy -- spp-commerce.znode-package.json      the companion plugin (another manifest in this folder)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { installedVersion, keepPreviousBrowserFiles, pluginsDir } from "./lib/store.mjs";

const target = process.argv[2] || ".";
const manifestFile = target === "." ? "znode-package.json" : target;
const { name, version } = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

// asset versions (row 145): every ?v=<version> in the theme's sources must be this release's version, or a changed
// asset would keep its old URL and stay cached in shoppers' browsers for up to a year
if (manifestFile === "znode-package.json") {
  const stale = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(tsx?|css|json)$/.test(entry.name)) {
        const text = fs.readFileSync(file, "utf8");
        for (const match of text.matchAll(/(?:\?v=|ASSET_VERSION = ")(\d+\.\d+\.\d+)/g)) if (match[1] !== version) stale.push(`${file}: ${match[0]}`);
      }
    }
  };
  walk("src");
  if (stale.length) {
    console.error(`asset versions differ from znode-package.json (${version}); update them first:\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
}

const previous = installedVersion(name);
const result = spawnSync(`npx znode deploy ${target}`, { stdio: "inherit", shell: true });
if (result.status !== 0) process.exit(result.status ?? 1);

const zip = path.join("releases", `${name}-${version}.zpkg.zip`);
const kept = path.join(pluginsDir(), ".versions", name);
fs.mkdirSync(kept, { recursive: true });
fs.copyFileSync(zip, path.join(kept, path.basename(zip)));
const all = fs.readdirSync(kept).filter((file) => file.endsWith(".zpkg.zip")).sort();
console.log(`kept ${path.basename(zip)} in ${path.join(".versions", name)} (${all.length} version${all.length === 1 ? "" : "s"} on disk: ${all.map((file) => file.slice(name.length + 1, -".zpkg.zip".length)).join(", ")})`);

// zero downtime (row 173): pages served just before this install still name the previous version's files
const { kept: previousKept, removed } = keepPreviousBrowserFiles(name, version, previous);
if (previousKept.length) console.log(`kept the previous version's browser files for pages served before this install: ${previousKept.join(", ")}`);
if (removed.length) console.log(`removed older versions' browser files: ${removed.join(", ")}`);
