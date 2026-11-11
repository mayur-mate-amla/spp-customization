// Package errors from the store's own log (rows 175, 182, 184). The store writes its server log to
// <store>/apps/webstore/logs/logs-<date>.txt (LOGGING_METHOD=FILE), entries of five lines (Timestamp, Level, Area,
// Message, Params). This lists the entries about runtime packages: a route that failed, a hook that threw, a server or
// browser slot that threw (row 185), a package skipped at load, the registry unreadable.
//   npm run store-log                      today's package entries
//   npm run store-log -- --package spp-commerce --date 2026-11-11 [--all-lines]
// The store finds itself from tsconfig.store.json (npm run link-store), else STORE_DIR.
// Note: the store keeps log entries in memory and writes them ten at a time, per server module, so an error can appear
// here minutes later, or (after a restart) never. See docs/scenarios/175-package-errors-logged.
import fs from "node:fs";
import path from "node:path";
import { pluginsDir } from "./lib/store.mjs";
import { bundlePosition, sameBuild, sourceAt } from "./lib/source-maps.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const storeDir =
  process.env.STORE_DIR ||
  (fs.existsSync("tsconfig.store.json") ? JSON.parse(fs.readFileSync("tsconfig.store.json", "utf8")).compilerOptions?.baseUrl : "") ||
  "";
if (!storeDir) throw new Error("no store: run npm run link-store -- <store repo>, or set STORE_DIR");
const date = arg("date", new Date().toISOString().slice(0, 10));
const pkg = arg("package", "");
const file = path.join(storeDir, "apps", "webstore", "logs", `logs-${date}.txt`);
if (!fs.existsSync(file)) {
  console.log(`no store log for ${date} (${file})`);
  process.exit(0);
}

// entries start at "Timestamp:"; a message may run over several lines (a stack)
const entries = fs
  .readFileSync(file, "utf8")
  .split(/\r?\n(?=Timestamp: )/)
  .map((text) => ({
    at: /^Timestamp: (.*)$/m.exec(text)?.[1] || "",
    level: /^Level: (.*)$/m.exec(text)?.[1] || "",
    area: /^Area: (.*)$/m.exec(text)?.[1] || "",
    message: (/(?:^|\n)Message: ([\s\S]*?)(?:\r?\nParams:|$)/.exec(text)?.[1] || "").trim(),
  }))
  // a browser slot or widget that threw (row 185) is logged from the browser: the store's RuntimeSlot passes its text as
  // logClient's area, so "Runtime plugin <name> failed to render." is the Area and the error with its stack the Message
  .map((entry) =>
    /^Runtime (?:plugin|widget) .* failed/.test(entry.area) ? { ...entry, message: `${entry.area} (in the browser) ${entry.message}` } : entry
  );
const about = entries.filter((entry) => /Runtime plugin|runtime package|cart hook|registry unreadable|\bhook\b.*failed/i.test(entry.message) && (!pkg || entry.message.includes(pkg)));
console.log(`${file}: ${entries.length} entries, ${about.length} about runtime packages${pkg ? ` (${pkg})` : ""}`);
for (const entry of about) {
  const [first, ...stack] = entry.message.split(/\r?\n/);
  console.log(`${entry.at}  ${entry.level.padEnd(5)}  ${first}`);
  // each frame in a package bundle, with the source line it comes from (row 182, through the maps of row 183)
  const frames = args.includes("--all-lines") ? stack : stack.filter((line) => bundlePosition(line)).slice(0, 3);
  for (const frame of frames) {
    console.log(`    ${frame.trim()}`);
    const position = bundlePosition(frame);
    if (!position) continue;
    // the map belongs to the installed build: a line from an earlier build of the same version would map to the wrong place
    const build = sameBuild(pluginsDir(), position);
    if (build === "rebuilt" || build === "gone") {
      console.log(`      -> (logged from an earlier build of ${position.bundle}: not mapped; see the zip kept in .versions/)`);
      continue;
    }
    const found = sourceAt(pluginsDir(), position.bundle, position.line, position.column);
    if (found) console.log(`      -> ${found.source}:${found.line}  ${found.text}`);
  }
}
