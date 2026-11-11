// Where a position in an installed bundle comes from (rows 182-183): a stack line from the store's log, or from the
// browser's console, read through the bundle's source map.
//   node scripts/source-at.mjs spp-sandbox-probe-1.0.0.server.mjs:98:19
//   node scripts/source-at.mjs "at fail (file:///D:/runtime-plugins-store/spp-sandbox-probe-1.0.0.server.mjs?v=1:98:19)"
//   node scripts/source-at.mjs --sources spp-customization-1.0.3.browser.mjs     the sources a bundle's map names
// Prints the source file, line and column, and that line of the source.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pluginsDir } from "./lib/store.mjs";
import { bundlePosition, sourceAt } from "./lib/source-maps.mjs";

const require = createRequire(path.resolve("package.json"));
const { SourceMapConsumer } = require("source-map");
const args = process.argv.slice(2);
const listSources = args[0] === "--sources";
const input = listSources ? args[1] : args.join(" ");
const match = /([a-z0-9-]+-\d+\.\d+\.\d+\.(?:server|browser)\.mjs)(?:\?[^:)\s]*)?(?::(\d+):(\d+))?/.exec(input || "");
if (!match) throw new Error("usage: node scripts/source-at.mjs <bundle>.mjs:<line>:<column> | --sources <bundle>.mjs");
const mapFile = path.join(pluginsDir(), `${match[1]}.map`);
if (!fs.existsSync(mapFile)) throw new Error(`no source map: ${mapFile}`);
const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
const consumer = new SourceMapConsumer(map);
if (listSources) {
  console.log(`${match[1]}.map: ${map.sources.length} sources, text included: ${map.sourcesContent?.filter(Boolean).length || 0}`);
  for (const source of map.sources) console.log(`  ${source}`);
  process.exit(0);
}
const position = bundlePosition(input);
const found = position && sourceAt(pluginsDir(), position.bundle, position.line, position.column);
if (!found) {
  console.log(`${input}: no mapping`);
  process.exit(1);
}
console.log(`${position.bundle}:${position.line}:${position.column}  ->  ${found.source}:${found.line}:${found.column}`);
console.log(`  ${found.line} | ${found.text}`);
