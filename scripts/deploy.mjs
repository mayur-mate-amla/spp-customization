// npm run deploy [-- <package>]: `znode deploy` (build, pack, install into the store's plugin folder), then keep the
// packed version next to the store in <plugin folder>/.versions/<name>/, so every deployed version stays on disk for a
// rollback (npm run rollback), whichever machine deployed it. The install itself removes the previous version's code.
//   npm run deploy                                         the theme (znode-package.json)
//   npm run deploy -- spp-commerce.znode-package.json      the companion plugin (another manifest in this folder)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pluginsDir } from "./lib/store.mjs";

const target = process.argv[2] || ".";
const manifestFile = target === "." ? "znode-package.json" : target;
const { name, version } = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

const result = spawnSync(`npx znode deploy ${target}`, { stdio: "inherit", shell: true });
if (result.status !== 0) process.exit(result.status ?? 1);

const zip = path.join("releases", `${name}-${version}.zpkg.zip`);
const kept = path.join(pluginsDir(), ".versions", name);
fs.mkdirSync(kept, { recursive: true });
fs.copyFileSync(zip, path.join(kept, path.basename(zip)));
const all = fs.readdirSync(kept).filter((file) => file.endsWith(".zpkg.zip")).sort();
console.log(`kept ${path.basename(zip)} in ${path.join(".versions", name)} (${all.length} version${all.length === 1 ? "" : "s"} on disk: ${all.map((file) => file.slice(name.length + 1, -".zpkg.zip".length)).join(", ")})`);
