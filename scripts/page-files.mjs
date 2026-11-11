// Which package files a store page loads, and how the browser may cache them (rows 143 and 145):
//   node scripts/page-files.mjs --path / [--store http://sppdemo.localhost:3000] [--theme <name>|none] [--again]
// Lists every request to the store's package file route (/api/extensions/files/...) with the package it belongs to
// (from the registry), its size, its Cache-Control and its ?v= version; then which packages of the registry were NOT
// loaded. --again opens the page a second time in the same browser and says which files came from the browser cache.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { pluginsDir } from "./lib/store.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const store = arg("store", process.env.STORE_URL || "http://localhost:3000").replace(/\/$/, "");
const pagePath = arg("path", "/");
const theme = arg("theme", "none");
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// file name -> package, from the registry (each entry's file, browser bundle, styles, labels; assets by name prefix)
const registry = JSON.parse(fs.readFileSync(path.join(pluginsDir(), "plugins.json"), "utf8"));
const entries = Array.isArray(registry) ? registry : registry.plugins || [];
const owner = (file) => {
  for (const entry of entries) {
    const names = [entry.file, entry.browser, entry.messages, ...(entry.styles || [])].filter(Boolean);
    if (names.includes(file) || file.startsWith(`${entry.name}-`)) return entry.name;
  }
  return "?";
};

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  if (theme !== "none") await page.setCookie({ name: "runtimeThemePreview", value: theme, url: store });

  const visit = async () => {
    const files = new Map();
    const onResponse = async (response) => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith("/api/extensions/files/")) return;
      const name = decodeURIComponent(url.pathname.split("/").pop());
      const length = Number(response.headers()["content-length"]) || (await response.buffer().catch(() => Buffer.alloc(0))).length;
      files.set(name, { name, pkg: owner(name), version: url.searchParams.get("v") || "-", status: response.status(), cached: response.fromCache(), bytes: length, cacheControl: response.headers()["cache-control"] || "-" });
    };
    page.on("response", onResponse);
    await page.goto(`${store}${pagePath}`, { waitUntil: "networkidle2", timeout: 120000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    page.off("response", onResponse);
    return [...files.values()].sort((a, b) => a.pkg.localeCompare(b.pkg) || a.name.localeCompare(b.name));
  };

  const first = await visit();
  console.log(`${store}${pagePath}${theme !== "none" ? ` (theme ${theme} previewed)` : ""}: ${first.length} package files`);
  for (const file of first) console.log(`  ${file.pkg.padEnd(18)} ${file.name.padEnd(46)} ${String(Math.round(file.bytes / 1024)).padStart(5)} KB  v=${file.version.slice(0, 10).padEnd(10)} ${file.cacheControl}`);
  const loaded = new Set(first.map((file) => file.pkg));
  console.log(`packages loaded: ${[...loaded].join(", ") || "none"}`);
  console.log(`packages in the registry not loaded: ${entries.map((entry) => entry.name).filter((name) => !loaded.has(name)).join(", ")}`);

  if (args.includes("--again")) {
    // --pause <seconds>: wait before the second visit (to redeploy a package meanwhile: row 145)
    const pause = Number(arg("pause", 0));
    if (pause) {
      console.log(`waiting ${pause} s before the second visit...`);
      await new Promise((resolve) => setTimeout(resolve, pause * 1000));
    }
    const second = await visit();
    for (const file of second) if (!file.cached) console.log(`  fetched again: ${file.name} v=${file.version} (${file.status})`);
    const fromCache = second.filter((file) => file.cached);
    console.log(`second visit: ${second.length} files, ${fromCache.length} from the browser cache${fromCache.length < second.length ? `; asked again: ${second.filter((file) => !file.cached).map((file) => `${file.name} (${file.status})`).join(", ")}` : ""}`);
  }
} finally {
  await browser.close();
}
