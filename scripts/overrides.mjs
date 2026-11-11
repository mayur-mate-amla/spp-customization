// Which store API routes are taken over, on which store, by which plugin, read from the store's registry (plugins.json)
// the way the proxy decides it (route-overrides.server.ts findRouteOverride): an enabled plugin (never a theme) placed
// for the store (its installation records, else its "stores"; "*" = every store), with "overrides" naming the path;
// the first such entry in registry order wins, and a later one for the same path is shadowed.
//   npm run overrides                     every store named in the registry
//   npm run overrides -- POCSppDemo MaxwellsHardware
// Per-store installations place a plugin per store; a previewed theme changes nothing: themes never take over routes
// (row 040).
//
// --probe <host> (row 164): can a browser skip an override by spelling the path another way? For each route taken over
// on the store, GET requests with the path changed (case, slashes, encodings, dot segments, a locale prefix, a guessed
// bypass header) go to 127.0.0.1 with that Host, raw (no normalization). Each answer is classified by the proxy's
// rewrite header (x-middleware-rewrite, sent by a development store): to the plugin's route = the override applied; a
// redirect = sent back to the canonical path; JSON or 405 without it = the store's own route answered (skipped); a page
// or the sign-in handler's 400 = no route. GET only: the store's POST routes answer 405 to a GET and change nothing.
//   npm run overrides -- POCSppDemo --probe sppdemo.localhost:3000
import fs from "node:fs";
import http from "node:http";
import { createHash } from "node:crypto";
import path from "node:path";
import { placementsFor, pluginsDir } from "./lib/store.mjs";

const args = process.argv.slice(2);
const probeAt = args.indexOf("--probe");
const probeHost = probeAt === -1 ? "" : args[probeAt + 1];
if (probeAt !== -1) args.splice(probeAt, 2);

const registry = JSON.parse(fs.readFileSync(path.join(pluginsDir(), "plugins.json"), "utf8"));
const entries = Array.isArray(registry) ? registry : registry.plugins || [];
const installations = Array.isArray(registry.installations) ? registry.installations : [];
const named = [
  ...new Set([
    ...entries.flatMap((entry) => (Array.isArray(entry.stores) ? entry.stores : [])),
    ...installations.flatMap((item) => [item.store, ...(Array.isArray(item.stores) ? item.stores : [])]),
  ]),
]
  .filter((code) => code && code !== "*")
  .sort();
const stores = args.length ? args : named;

const takenOver = new Map();
for (const store of stores) {
  const placed = new Set(placementsFor({ plugins: entries, installations }, store).map((item) => item.entry));
  const taken = new Map();
  const lines = [];
  for (const entry of entries) {
    if (entry.kind === "theme" || !entry.overrides || typeof entry.overrides !== "object") continue;
    const active = entry.enabled !== false && placed.has(entry);
    for (const [route, target] of Object.entries(entry.overrides)) {
      const where = `/api/extensions/plugins/${entry.name}/${target}`;
      if (!active) lines.push(`  ${route}  (${entry.name}: ${entry.enabled === false ? "switched off" : "not placed for this store"})`);
      else if (taken.has(route)) lines.push(`  ${route}  (${entry.name}: shadowed by ${taken.get(route).name})`);
      else {
        taken.set(route, { name: entry.name, where });
        lines.push(`  ${route}  ->  ${where}`);
      }
    }
  }
  takenOver.set(store, taken);
  console.log(`${store}: ${taken.size ? `${taken.size} store route(s) taken over` : "the store's own routes only"}`);
  for (const line of lines) console.log(line);
}

if (probeHost) {
  const [hostname, port = "80"] = probeHost.split(":");
  const get = (rawPath, headers = {}) =>
    new Promise((resolve) => {
      const request = http.request({ host: "127.0.0.1", port: Number(port), path: rawPath, method: "GET", headers: { Host: probeHost, ...headers } }, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
      });
      request.on("error", (error) => resolve({ status: 0, headers: {}, body: error.message }));
      request.setTimeout(120000, () => request.destroy(new Error("timeout")));
      request.end();
    });
  const variants = (route) => {
    const [, first, ...rest] = route.split("/");
    const tail = rest.join("/");
    const last = rest[rest.length - 1] || "";
    return [
      ["as the store calls it", route],
      ["trailing slash", `${route}/`],
      ["upper case", route.toUpperCase()],
      ["one letter upper case", route.replace(/\/([a-z])([^/]*)$/, (_, letter, more) => `/${letter.toUpperCase()}${more}`)],
      ["double slash at the start", `/${route}`],
      ["double slash inside", `/${first}//${tail}`],
      ["dot segment /./", `/${first}/./${tail}`],
      ["dot-dot segment", `/${first}/x/../${tail}`],
      ["encoded letter (%61 for a)", route.replace("a", "%61")],
      ["encoded slash %2F", `/${first}%2F${tail.replace(/\//g, "%2F")}`],
      ["encoded dash %2D", last.includes("-") ? route.replace(/-(?=[^/]*$)/, "%2D") : `${route}%2D`],
      ["semicolon parameter ;x", `${route};x`],
      ["trailing %20", `${route}%20`],
      ["trailing dot", `${route}.`],
      ["backslash", `/${first}\\${tail}`],
      ["locale prefix /en-US", `/en-US${route}`],
      ["locale prefix /fr-FR", `/fr-FR${route}`],
    ];
  };
  const classify = (response, where) => {
    const rewrite = String(response.headers["x-middleware-rewrite"] || "");
    if (rewrite.startsWith(where)) return ["plugin", "the plugin (override applied)"];
    if (response.status >= 300 && response.status < 400) return ["redirect", `redirect to ${response.headers.location}`];
    const json = String(response.headers["content-type"] || "").includes("json");
    if ((response.status >= 200 && response.status < 300 && json) || response.status === 405) return ["SKIPPED", `${response.status}: THE STORE'S OWN ROUTE (override skipped)`];
    if (/NextAuth/.test(response.body)) return ["none", `${response.status}: no route (the sign-in handler)`];
    return ["none", `${response.status}: no route (${json ? "JSON" : "a store page"})`];
  };
  // the header a plugin's context.original() sends to reach the store's route: a guess must not work. The token is a
  // hash of the store's secret (RUNTIME_ROUTE_SECRET, else NEXTAUTH_SECRET, SECRET or API_KEY); with none set it is the
  // hash of the prefix alone, the same on every such store, so that is tried too
  const noSecret = createHash("sha256").update("runtime-original-route:").digest("hex");
  const guesses = [["1", "1"], ["true", "true"], ["spp-commerce", "spp-commerce"], [noSecret, "the no-secret token"]];
  let skipped = 0;
  let checks = 0;
  for (const [store, taken] of takenOver) {
    for (const [route, { where }] of taken) {
      console.log(`\n${probeHost} (${store}): ${route}`);
      for (const [label, rawPath] of variants(route)) {
        const [kind, text] = classify(await get(`${rawPath}?probe=1`), where);
        checks++;
        if (kind === "SKIPPED") skipped++;
        // a redirect must lead back to the canonical path, which the override then takes
        console.log(`  ${kind === "SKIPPED" ? "FAIL" : "ok  "} ${label.padEnd(28)} ${rawPath.padEnd(48)} ${text}`);
      }
      for (const [guess, name] of guesses) {
        const [kind, text] = classify(await get(`${route}?probe=1`, { "x-runtime-original-route": guess }), where);
        checks++;
        if (kind === "SKIPPED") skipped++;
        console.log(`  ${kind === "SKIPPED" ? "FAIL" : "ok  "} ${`bypass header: ${name}`.padEnd(28)} ${route.padEnd(48)} ${text}`);
      }
    }
  }
  console.log(`\n${checks} requests on ${hostname}: ${skipped ? `${skipped} reached the store's own route` : "none reached the store's own route"}`);
  process.exit(skipped ? 1 : 0);
}
