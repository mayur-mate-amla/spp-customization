// Zero downtime (row 173): requests a store page and a package route without pause while a command runs (a deploy),
// then checks that every bundle and stylesheet those pages pointed at still loads. A page served a moment before a
// release still asks for its files a moment after it, so they must outlive the release.
//   node scripts/release-watch.mjs [--host localhost:3000] [--theme spp-customization] [--path /]
//        [--route /api/extensions/plugins/spp-customization/store-status] -- npm run deploy
// Reports each request that failed (status >= 500, or no answer), the package versions the pages named over time,
// and the files named by pages served during the run that no longer load.
import http from "node:http";
import { spawn } from "node:child_process";

const all = process.argv.slice(2);
const split = all.indexOf("--");
const args = split === -1 ? all : all.slice(0, split);
const command = split === -1 ? [] : all.slice(split + 1);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const host = arg("host", "localhost:3000");
const theme = arg("theme", "spp-customization");
const pagePath = arg("path", "/");
const route = arg("route", "/api/extensions/plugins/spp-customization/store-status");
if (!command.length) throw new Error("usage: node scripts/release-watch.mjs [options] -- <command>");

function get(path) {
  const started = Date.now();
  return new Promise((resolve) => {
    const request = http.request({ host: "127.0.0.1", port: Number(host.split(":")[1] || 80), path, headers: { Host: host, Cookie: theme ? `runtimeThemePreview=${theme}` : "" } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, ms: Date.now() - started, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.on("error", (error) => resolve({ status: 0, ms: Date.now() - started, body: error.message }));
    request.setTimeout(60000, () => request.destroy(new Error("timeout")));
    request.end();
  });
}

const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;
const log = [];
const files = new Map(); // file URL -> first seen at
const versions = [];
let running = true;
let done = null;

async function watch(kind, path) {
  while (running) {
    const response = await get(path);
    log.push({ kind, at: Date.now() - t0, status: response.status, ms: response.ms });
    if (kind === "page" && response.status === 200) {
      for (const match of response.body.matchAll(/\/api\/extensions\/files\/([a-z0-9-]+-\d+\.\d+\.\d+\.(?:browser\.mjs|css))(\?v=[0-9.]+)?/g)) {
        const url = `/api/extensions/files/${match[1]}${match[2] || ""}`;
        if (!files.has(url)) files.set(url, at());
      }
      const version = /spp-customization-(\d+\.\d+\.\d+)\.browser\.mjs/.exec(response.body)?.[1] || "-";
      if (versions[versions.length - 1]?.version !== version) versions.push({ version, at: at() });
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

const watchers = [watch("page", pagePath), watch("route", route), watch("page", pagePath)];
await new Promise((resolve) => setTimeout(resolve, 3000));
console.log(`${at()}: running ${command.join(" ")}`);
const child = spawn(command.join(" "), { shell: true, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", (chunk) => process.stdout.write(`  | ${chunk.toString().trim().split("\n").join("\n  | ")}\n`));
child.stderr.on("data", (chunk) => process.stdout.write(`  | ${chunk.toString().trim().split("\n").join("\n  | ")}\n`));
await new Promise((resolve) => child.on("exit", (code) => resolve((done = code))));
console.log(`${at()}: the command ended (exit ${done}); watching 6 s more`);
await new Promise((resolve) => setTimeout(resolve, 6000));
running = false;
await Promise.all(watchers);

const failed = log.filter((entry) => entry.status === 0 || entry.status >= 500);
for (const kind of ["page", "route"]) {
  const entries = log.filter((entry) => entry.kind === kind);
  const slowest = Math.max(...entries.map((entry) => entry.ms));
  const statuses = [...entries.reduce((map, entry) => map.set(entry.status, (map.get(entry.status) || 0) + 1), new Map())].map(([status, n]) => `${n} x ${status}`).join(", ");
  console.log(`${kind.padEnd(5)} ${entries.length} requests: ${statuses}; slowest ${slowest} ms`);
}
console.log(`theme version the pages named: ${versions.map((item) => `${item.version} (from ${item.at})`).join(" -> ")}`);
const missing = [];
for (const [url, seen] of files) {
  const response = await get(url);
  if (response.status !== 200) missing.push(`${url} (named by pages from ${seen}): ${response.status}`);
}
console.log(`files named by pages during the run: ${files.size}; no longer loading: ${missing.length}`);
for (const line of missing) console.log(`  ${line}`);
console.log(failed.length || missing.length ? `NOT zero downtime: ${failed.length} failed request(s), ${missing.length} file(s) gone` : "zero downtime: no failed request, every file still loads");
process.exit(failed.length || missing.length ? 1 : 0);
