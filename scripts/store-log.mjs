// Package errors from the store's own log (rows 175, 182, 184). The store writes its server log to
// <store>/apps/webstore/logs/logs-<date>.txt (LOGGING_METHOD=FILE), entries of five lines (Timestamp, Level, Area,
// Message, Params). This lists the entries about runtime packages: a route that failed, a hook that threw, a package
// skipped at load, the registry unreadable.
//   npm run store-log                      today's package entries
//   npm run store-log -- --package spp-commerce --date 2026-11-11 [--all-lines]
// The store finds itself from tsconfig.store.json (npm run link-store), else STORE_DIR.
// Note: the store keeps log entries in memory and writes them ten at a time, per server module, so an error can appear
// here minutes later, or (after a restart) never. See docs/scenarios/175-package-errors-logged.
import fs from "node:fs";
import path from "node:path";

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
    message: (/(?:^|\n)Message: ([\s\S]*?)(?:\r?\nParams:|$)/.exec(text)?.[1] || "").trim(),
  }));
const about = entries.filter((entry) => /Runtime plugin|runtime package|cart hook|registry unreadable|\bhook\b.*failed/i.test(entry.message) && (!pkg || entry.message.includes(pkg)));
console.log(`${file}: ${entries.length} entries, ${about.length} about runtime packages${pkg ? ` (${pkg})` : ""}`);
for (const entry of about) {
  const [first, ...stack] = entry.message.split(/\r?\n/);
  console.log(`${entry.at}  ${entry.level.padEnd(5)}  ${first}`);
  const where = stack.find((line) => /runtime-plugins|\.server\.mjs/.test(line));
  if (args.includes("--all-lines")) for (const line of stack) console.log(`    ${line.trim()}`);
  else if (where) console.log(`    ${where.trim()}`);
}
