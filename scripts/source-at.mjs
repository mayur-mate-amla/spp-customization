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
const line = Number(match[2]);
const column = Number(match[3]) - 1;
const original = consumer.originalPositionFor({ line, column });
if (original.line == null) {
  console.log(`${match[1]}:${line}:${column + 1}: no mapping`);
  process.exit(1);
}
const content = consumer.sourceContentFor(original.source, true) || "";
const text = content.split(/\r?\n/)[original.line - 1] || "";
console.log(`${match[1]}:${line}:${column + 1}  ->  ${original.source}:${original.line}:${original.column + 1}`);
console.log(`  ${original.line} | ${text.trim()}`);
