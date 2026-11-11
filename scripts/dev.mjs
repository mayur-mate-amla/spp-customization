// npm run dev [-- <manifest>]: deploy a package on every save (row 186). Then refresh the store page: the store loads
// the new bundle under a new ?v= URL, and nothing reloads an open page by itself.
//   npm run dev                                         the theme (znode-package.json), watching src/
//   npm run dev -- spp-commerce.znode-package.json      a companion package, watching its own folder (src/commerce/)
// Why not `znode dev`: it deploys the folder, so it always deploys the theme (also when given spp-promos' manifest),
// and it runs the SDK's deploy, not scripts/deploy.mjs: no source maps back to src/ (row 183), no copy in .versions/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const manifestFile = process.argv[2] && process.argv[2] !== "." ? process.argv[2] : "znode-package.json";
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const entries = Object.values(manifest.build || {}).map((file) => path.dirname(path.normalize(file)));
if (!entries.length) throw new Error(`${manifestFile}: no "build" entry points to watch`);

// the folder the package's entry points share: src/ for the theme, src/commerce/ for spp-commerce, ...
const common = entries.reduce((shared, dir) => {
  const a = shared.split(path.sep);
  const b = dir.split(path.sep);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(0, i).join(path.sep);
});
const root = common || ".";
const ignored = /(^|[\\/])(dist[^\\/]*|releases|\.build|node_modules)([\\/]|$)/;

let running = false;
let again = false;
let timer = null;
function deploy(reason) {
  if (running) {
    again = true;
    return;
  }
  running = true;
  const start = performance.now();
  console.log(`\n${new Date().toLocaleTimeString()}  ${reason}: deploying ${manifest.name}`);
  const { status } = spawnSync(process.execPath, ["scripts/deploy.mjs", manifestFile], { stdio: "inherit" });
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(status === 0 ? `deployed in ${seconds} s: refresh the page` : `deploy failed (${seconds} s): fix and save again`);
  running = false;
  if (again) {
    again = false;
    deploy("changed while deploying");
  }
}

const changed = (file) => {
  if (!file || ignored.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => deploy(`${file} changed`), 300);
};
fs.watch(root, { recursive: true }, (_event, file) => changed(file && path.join(root, String(file))));
fs.watch(".", (_event, file) => file === manifestFile && changed(file));
deploy("start");
console.log(`watching ${root}${path.sep} and ${manifestFile} (Ctrl+C to stop)`);
