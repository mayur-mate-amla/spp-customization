// Is the local store set up to run this repository's packages (row 193)?
//   npm run local-check                                        STORE_URL, else http://localhost:3000
//   npm run local-check -- http://sppdemo.localhost:3000 http://localhost:3000
// Checks that the store and this repository use the same plugin folder, lists this repository's packages as installed
// there (version, on or off, stores), and for each URL which of them the page actually loads. Each store answers on
// its own host name (Znode maps a domain to a store), so a URL that loads none of them is usually the wrong host.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pluginsDir } from "./lib/store.mjs";

// GET a page as a browser would: <store>.localhost names go to this machine (browsers do that; Node's resolver doesn't)
function get(url) {
  const { hostname, port, pathname, search, host } = new URL(url);
  const local = hostname === "localhost" || hostname.endsWith(".localhost");
  return new Promise((resolve, reject) => {
    const request = http.get(
      { host: local ? "127.0.0.1" : hostname, port: port || 80, path: pathname + search, headers: { host }, timeout: 120000 },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve({ status: response.statusCode, html: body }));
      }
    );
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", reject);
  });
}

const problems = [];
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

// 1. the plugin folder: this repository's (RUNTIME_PLUGINS_DIR / znode.local.json) and the store's (.env)
const dir = pluginsDir();
const storeDir = process.env.STORE_DIR || (fs.existsSync("tsconfig.store.json") ? JSON.parse(fs.readFileSync("tsconfig.store.json", "utf8")).compilerOptions?.baseUrl : "");
console.log(`plugin folder (this repo): ${dir || "(none: set RUNTIME_PLUGINS_DIR or znode.local.json)"}`);
if (!dir) problems.push("no plugin folder for this repository");
if (storeDir) {
  const envFile = path.join(storeDir, "apps", "webstore", ".env");
  const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
  const storeValue = /^RUNTIME_PLUGINS_DIR\s*=\s*"?([^"\r\n#]*)"?/m.exec(env)?.[1]?.trim() || "";
  console.log(`plugin folder (the store's apps/webstore/.env): ${storeValue || "(not set: the store runs no packages)"}`);
  if (!storeValue) problems.push(`RUNTIME_PLUGINS_DIR is not set in ${envFile}`);
  else if (dir && !same(storeValue, dir)) problems.push(`the store reads ${storeValue}, this repository deploys to ${dir}`);
} else console.log("store repo: not linked (npm run link-store -- <store repo>), its .env not checked");

// 2. this repository's packages in the registry
const manifests = fs.readdirSync(".").filter((file) => file === "znode-package.json" || file.endsWith(".znode-package.json"));
const ours = manifests.map((file) => ({ ...JSON.parse(fs.readFileSync(file, "utf8")), file }));
const registryFile = dir && path.join(dir, "plugins.json");
const registry = registryFile && fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile, "utf8")) : { plugins: [] };
if (registryFile && !fs.existsSync(registryFile)) problems.push(`${registryFile} not found`);
console.log("\npackages from this repository in plugins.json:");
for (const { name, version, kind, file } of ours) {
  const entry = registry.plugins.find((p) => p.name === name);
  const placed = (registry.installations || []).filter((i) => i.package === name).map((i) => i.store);
  if (!entry) console.log(`  ${name.padEnd(20)} ${kind.padEnd(7)} not installed (npm run deploy${file === "znode-package.json" ? "" : ` -- ${file}`})`);
  else {
    const stores = [...new Set([...(entry.stores || []), ...placed])];
    console.log(`  ${name.padEnd(20)} ${kind.padEnd(7)} ${entry.version}${entry.version === version ? "" : ` (source: ${version})`}  ${entry.enabled ? "on " : "off"}  stores: ${stores.length ? stores.join(", ") : "none"}${kind === "theme" ? "  (a theme can also be seen with the preview)" : ""}`);
  }
}

// 3. which of them each store URL loads
const urls = process.argv.slice(2).filter((arg) => /^https?:\/\//.test(arg));
for (const url of urls.length ? urls : [process.env.STORE_URL || "http://localhost:3000"]) {
  let html = "";
  let status = 0;
  try {
    ({ status, html } = await get(url));
  } catch (error) {
    problems.push(`${url}: ${error.code || error.message}`);
    console.log(`\n${url}: no answer (is the store running? npx nx dev webstore in the store repo)`);
    continue;
  }
  const loaded = [...new Set([...html.matchAll(/\/api\/extensions\/files\/([a-z0-9-]+)-\d+\.\d+\.\d+\.browser\.mjs/g)].map((m) => m[1]))];
  const mine = loaded.filter((name) => ours.some((p) => p.name === name));
  console.log(`\n${url}: HTTP ${status}, "${/<title>([^<]*)<\/title>/.exec(html)?.[1] || ""}"`);
  console.log(`  packages the page loads: ${loaded.join(", ") || "none"}`);
  console.log(`  from this repository: ${mine.join(", ") || "none: this host is another store (each store has its own host name), or nothing is placed on it"}`);
}

console.log(problems.length ? `\n${problems.length} problem(s):\n  ${problems.join("\n  ")}` : "\nno problems");
process.exitCode = problems.length ? 1 : 0;
