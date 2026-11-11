// What the store's package-files route serves and refuses (rows 160-162, 168) and the preview switch (163), checked
// with raw requests:
//   npm run probe-files [-- --host sppdemo.localhost:3000] [--json out.json]
// GET /api/extensions/files/<name> is the only way a browser reads the plugin folder. It must serve the browser parts
// of packages and refuse everything else:
//   160  every package's server bundle and its source map, the current version and any older one still on disk, also
//        under other spellings (case, a trailing dot or space, an NTFS stream name, a Windows 8.3 short name)
//   161  the registry (plugins.json) and its copies: the temp file of a write, .history/, the lock, .versions/ zips
//   162  paths out of the plugin folder: ../ in every encoding (raw, %2F, %5C, %2e, double-encoded), absolute paths,
//        a UNC path, to a real file with a served type (this repo's scripts/shot.mjs)
//   168  an SVG's headers (no script when opened directly): Content-Security-Policy with sandbox, nosniff
//   163  the theme preview switch: off (404) in production; where it is on, its "to" must not redirect off the store
// Two controls (a browser bundle and an image) must load, so a refusal is not the route being down. The requests go to
// 127.0.0.1 with the store's Host header and the path exactly as written (Node does not normalize it), as a hostile
// client would send them. Exit code 1 if anything is served that should not be.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pluginsDir } from "./lib/store.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const host = arg("host", "sppdemo.localhost:3000");
const out = arg("json", "");
const dir = pluginsDir();
const ROUTE = "/api/extensions/files/";

function get(rawPath) {
  return new Promise((resolve) => {
    const request = http.request({ host: "127.0.0.1", port: Number(host.split(":")[1] || 80), path: rawPath, method: "GET", headers: { Host: host } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks).length }));
    });
    request.on("error", (error) => resolve({ status: 0, headers: {}, bytes: 0, error: error.message }));
    request.setTimeout(120000, () => request.destroy(new Error("timeout")));
    request.end();
  });
}

const files = fs.readdirSync(dir);
const serverParts = files.filter((name) => /\.server\.m?js(\.map)?$/i.test(name));
const registry = JSON.parse(fs.readFileSync(path.join(dir, "plugins.json"), "utf8"));
const browserBundle = registry.plugins.find((entry) => entry.enabled !== false && entry.browser)?.browser;
const svg = files.find((name) => name.endsWith(".svg"));
const historyCopy = fs.existsSync(path.join(dir, ".history")) ? fs.readdirSync(path.join(dir, ".history")).sort().pop() : "";
const versionsDir = path.join(dir, ".versions");
const versionZip = fs.existsSync(versionsDir) ? fs.readdirSync(versionsDir).flatMap((name) => (fs.statSync(path.join(versionsDir, name)).isDirectory() ? fs.readdirSync(path.join(versionsDir, name)).map((zip) => `${name}/${zip}`) : [])).shift() : "";

// Windows 8.3 short names of the server parts, if the volume makes them (dir /x)
let shortNames = [];
if (process.platform === "win32") {
  try {
    const listing = execFileSync("cmd", ["/c", "dir", "/x", path.join(dir, "*.server.mjs")], { encoding: "utf8" });
    shortNames = [...listing.matchAll(/\s([A-Z0-9_~-]{1,8}\.[A-Z0-9]{1,3})\s+\S+\.server\.mjs\s*$/gim)].map((match) => match[1]);
  } catch {
    shortNames = [];
  }
}

const e = encodeURIComponent;
// a real file outside the plugin folder, with a type the route serves (.mjs): this repo's screenshot script
const outside = path.relative(dir, path.resolve("scripts/shot.mjs"));
const outsideParts = outside.split(path.sep);
const sample = serverParts.find((name) => name.endsWith(".server.mjs")) || "x.server.mjs";

const cases = [
  ["control", "a browser bundle (must load)", ROUTE + e(browserBundle), 200],
  ["control", "an image (must load)", ROUTE + e(svg), 200],
  ...serverParts.map((name) => ["160", `server part on disk: ${name}`, ROUTE + e(name), 404]),
  ["160", "upper case", ROUTE + e(sample.toUpperCase()), 404],
  ["160", "trailing dot", ROUTE + e(`${sample}.`), 404],
  ["160", "trailing space", ROUTE + e(`${sample} `), 404],
  ["160", "NTFS stream ::$DATA", ROUTE + e(`${sample}::$DATA`), 404],
  ["160", "dot encoded (%2E)", ROUTE + sample.replace(/\./g, "%2E"), 404],
  ["160", "double-encoded name", ROUTE + e(e(sample)), 404],
  ...shortNames.map((name) => ["160", `8.3 short name ${name}`, ROUTE + e(name), 404]),
  ["161", "plugins.json", ROUTE + "plugins.json", 404],
  ["161", "PLUGINS.JSON", ROUTE + "PLUGINS.JSON", 404],
  ["161", "plugins.json with a served type (.css after a null byte)", ROUTE + "plugins.json%00.css", 404],
  ["161", "plugins.json.map (served type .map)", ROUTE + "plugins.json.map", 404],
  ["161", "a write's temp file", ROUTE + "plugins.json.tmp-1", 404],
  ["161", "the lock folder", ROUTE + ".plugins.lock", 404],
  ...(historyCopy ? [["161", `.history/${historyCopy}`, ROUTE + e(`.history/${historyCopy}`), 404]] : []),
  ...(versionZip ? [["161", `.versions/${versionZip}`, ROUTE + e(`.versions/${versionZip}`), 404]] : []),
  ["162", "../ raw", ROUTE + outsideParts.join("/"), 404],
  ["162", "..%2F", ROUTE + outsideParts.join("%2F"), 404],
  ["162", "..%5C (backslash)", ROUTE + outsideParts.join("%5C"), 404],
  ["162", "%2e%2e%2f", ROUTE + outsideParts.map((part) => (part === ".." ? "%2e%2e" : part)).join("%2f"), 404],
  ["162", "double-encoded %252e%252e%252f", ROUTE + outsideParts.map((part) => (part === ".." ? "%252e%252e" : part)).join("%252f"), 404],
  ["162", "....// (filter evasion)", ROUTE + outsideParts.map((part) => (part === ".." ? "...." : part)).join("%2F%2F"), 404],
  ["162", "absolute path", ROUTE + e(path.resolve("scripts/shot.mjs")), 404],
  ["162", "absolute path, forward slashes", ROUTE + e(path.resolve("scripts/shot.mjs").replace(/\\/g, "/")), 404],
  ["162", "UNC path", ROUTE + e(`\\\\127.0.0.1\\${path.resolve("scripts/shot.mjs").replace(":", "$")}`), 404],
  ["162", "file: URL", ROUTE + e(`file:///${path.resolve("scripts/shot.mjs").replace(/\\/g, "/")}`), 404],
];

const results = [];
for (const [row, label, rawPath, expected] of cases) {
  const response = await get(rawPath);
  const ok = expected === 200 ? response.status === 200 : response.status !== 200;
  results.push({ row, label, path: rawPath, status: response.status, bytes: response.bytes, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${row.padEnd(7)} ${String(response.status).padEnd(4)} ${label}${response.status === 200 && expected !== 200 ? `  <-- served ${response.bytes} bytes` : ""}`);
}

// 168: what an SVG is served with
const svgResponse = await get(ROUTE + e(svg));
const csp = String(svgResponse.headers["content-security-policy"] || "");
const svgChecks = [
  ["content-type image/svg+xml", String(svgResponse.headers["content-type"] || "").startsWith("image/svg+xml")],
  ["Content-Security-Policy with sandbox", /(^|;)\s*sandbox/.test(csp)],
  ["Content-Security-Policy default-src 'none' (no script)", /default-src 'none'/.test(csp)],
  ["X-Content-Type-Options: nosniff", svgResponse.headers["x-content-type-options"] === "nosniff"],
];
console.log(`168     SVG ${svg}: ${csp}`);
for (const [label, ok] of svgChecks) console.log(`${ok ? "ok  " : "FAIL"} 168     ${label}`);

// 163: the theme preview switch (/api/extensions/preview). Off (404) in a production build unless
// RUNTIME_THEME_PREVIEW=true. Where it is on, its "to" must only lead back to this store: a redirect to another host
// from the store's own domain is an open redirect (a link that looks like the store and lands on a phishing page).
const preview = await get("/api/extensions/preview?list");
const previewChecks = [];
if (preview.status === 404) {
  console.log("163     preview switch: off on this host (404)");
} else {
  console.log(`163     preview switch: ON on this host (${preview.status}): a development store, or RUNTIME_THEME_PREVIEW=true`);
  for (const to of ["/category/1", "//evil.example/", "https://evil.example/", "/%5Cevil.example/", "/%5C%5Cevil.example/", "/%09/evil.example/", "/%0A/evil.example/"]) {
    const response = await get(`/api/extensions/preview?to=${to}`);
    const location = String(response.headers.location || "");
    let target = "";
    try {
      target = new URL(location, `http://${host}`).host;
    } catch {
      target = "(unparsable)";
    }
    const ok = !location || target === host;
    previewChecks.push(ok);
    console.log(`${ok ? "ok  " : "FAIL"} 163     to=${to.padEnd(22)} ${response.status} -> ${location || "(no redirect)"}${ok ? "" : "   <-- leaves the store: open redirect"}`);
  }
}

const failed = results.filter((result) => !result.ok).length + svgChecks.filter(([, ok]) => !ok).length + previewChecks.filter((ok) => !ok).length;
console.log(`${results.length + svgChecks.length + previewChecks.length} checks on ${host}, plugin folder ${dir}${shortNames.length ? "" : " (no 8.3 short names on this volume)"}: ${failed ? `${failed} FAILED` : "all passed"}`);
if (out) fs.writeFileSync(out, JSON.stringify({ host, results, svg: { file: svg, headers: svgResponse.headers } }, null, 2));
process.exit(failed ? 1 : 0);
