// npm run deploy: `znode deploy .` (build, pack, install into the store's plugin folder), then keep the packed version
// next to the store in <plugin folder>/.versions/<name>/, so every deployed version stays on disk for a rollback
// (npm run rollback), whichever machine deployed it. The install itself removes the previous version's code files.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { manifest, name, pluginsDir, versionsDir } from "./lib/store.mjs";

const result = spawnSync("npx znode deploy .", { stdio: "inherit", shell: true });
if (result.status !== 0) process.exit(result.status ?? 1);

const zip = path.join("releases", `${name}-${manifest.version}.zpkg.zip`);
const target = versionsDir(pluginsDir());
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(zip, path.join(target, path.basename(zip)));
const kept = fs.readdirSync(target).filter((file) => file.endsWith(".zpkg.zip")).sort();
console.log(`kept ${path.basename(zip)} in ${path.join(".versions", name)} (${kept.length} version${kept.length === 1 ? "" : "s"} on disk: ${kept.map((file) => file.slice(name.length + 1, -".zpkg.zip".length)).join(", ")})`);
