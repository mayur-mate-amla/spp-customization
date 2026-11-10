// One-command rollback: reinstall an older packed version into the store's plugin folder.
//   npm run rollback               lists the versions packed in releases/
//   npm run rollback -- 1.0.0      installs releases/<name>-1.0.0.zpkg.zip (the store's settings and stores are kept)
// The store's plugin folder keeps only the installed version's code (009), so a rollback needs the older zip:
// npm run pack / deploy leaves one per version in releases/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const name = JSON.parse(fs.readFileSync("znode-package.json", "utf8")).name;
const version = process.argv[2];
const packed = fs.existsSync("releases") ? fs.readdirSync("releases").filter((file) => file.startsWith(`${name}-`) && file.endsWith(".zpkg.zip")) : [];

if (!version) {
  console.log(packed.length ? `packed versions:\n${packed.map((file) => `  ${file.slice(name.length + 1, -".zpkg.zip".length)}`).join("\n")}` : "no packed versions in releases/");
  console.log("usage: npm run rollback -- <version>");
  process.exit(0);
}
const zip = path.join("releases", `${name}-${version}.zpkg.zip`);
if (!fs.existsSync(zip)) {
  console.error(`${zip} not found; packed versions: ${packed.join(", ") || "none"}`);
  process.exit(1);
}
const result = spawnSync("npx", ["znode", "install", zip], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
