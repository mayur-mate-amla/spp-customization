// Debugging a package in the browser by its TypeScript (row 182): a breakpoint on a line of a .tsx file, set through
// the bundle's source map, in a real page; when it pauses, the paused place (mapped back) and local values.
//   node scripts/debug-break.mjs --file src/slots/TrustStrip.tsx --find "setStatus(data)" --eval data
//        [--store http://localhost:3000] [--theme spp-customization] [--path /]
// The same thing devtools does when you click a line number in Sources: this script shows it works without a person.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
import { manifest, pluginsDir } from "./lib/store.mjs";

const require = createRequire(path.resolve("package.json"));
const { SourceMapConsumer } = require("source-map");
const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const store = arg("store", "http://localhost:3000");
const theme = arg("theme", manifest.name);
const file = arg("file", "src/slots/TrustStrip.tsx");
const find = arg("find", "setStatus(data)");
const expressions = arg("eval", "data").split(",");
const pkg = arg("package", manifest.name);
const version = arg("version", pkg === manifest.name ? manifest.version : "1.0.0");
const bundle = `${pkg}-${version}.browser.mjs`;
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// the source line, and where it is in the bundle
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
const sourceLine = lines.findIndex((line) => line.includes(find)) + 1;
if (!sourceLine) throw new Error(`"${find}" is not in ${file}`);
const map = new SourceMapConsumer(JSON.parse(fs.readFileSync(path.join(pluginsDir(), `${bundle}.map`), "utf8")));
const source = `${pkg}/${file.split(path.sep).join("/")}`;
const column = lines[sourceLine - 1].indexOf(find);
const generated = map.generatedPositionFor({ source, line: sourceLine, column, bias: SourceMapConsumer.LEAST_UPPER_BOUND });
if (generated.line == null) throw new Error(`no mapping for ${source}:${sourceLine}`);
console.log(`breakpoint: ${source}:${sourceLine}  ${lines[sourceLine - 1].trim()}`);
console.log(`  = ${bundle}:${generated.line}:${generated.column + 1} (through ${bundle}.map)`);

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  if (theme !== "none") await page.setCookie({ name: "runtimeThemePreview", value: theme, url: store });
  const cdp = await page.createCDPSession();
  await cdp.send("Debugger.enable");
  await cdp.send("Debugger.setBreakpointByUrl", { urlRegex: `/api/extensions/files/${bundle.replace(/\./g, "\\.")}`, lineNumber: generated.line - 1, columnNumber: generated.column });
  const paused = new Promise((resolve) => cdp.once("Debugger.paused", resolve));
  page.goto(`${store}${arg("path", "/")}`, { timeout: 180000 }).catch(() => undefined);
  const event = await Promise.race([paused, new Promise((_, reject) => setTimeout(() => reject(new Error("never paused in 120 s")), 120000))]);
  const frame = event.callFrames[0];
  const back = map.originalPositionFor({ line: frame.location.lineNumber + 1, column: frame.location.columnNumber });
  console.log(`paused: ${event.reason} in ${frame.functionName || "(anonymous)"} at ${bundle}:${frame.location.lineNumber + 1}:${frame.location.columnNumber + 1}`);
  console.log(`  = ${back.source}:${back.line}  ${(lines[back.line - 1] || "").trim()}`);
  for (const expression of expressions) {
    const { result } = await cdp.send("Debugger.evaluateOnCallFrame", { callFrameId: frame.callFrameId, expression: `JSON.stringify(${expression})`, returnByValue: true });
    console.log(`  ${expression} = ${result.value ?? result.description}`);
  }
  const scopes = frame.scopeChain.filter((scope) => scope.type === "local" || scope.type === "closure").map((scope) => scope.type);
  console.log(`  scopes: ${scopes.join(", ")}`);
  await cdp.send("Debugger.resume");
} finally {
  await browser.close();
}
