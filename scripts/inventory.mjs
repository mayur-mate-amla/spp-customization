// What a package carries, read from its build (what the store loads), not from the sources:
//   npm run inventory [-- <manifest>]       (default: znode-package.json; run `npx znode build <manifest>` first)
// Prints the manifest's part (kind, parent chain, settings, widgets, pages, styles, assets, permissions) and the built
// browser and server parts' extension points (slots, transforms, widgets, hooks, routes, server slots and pages).
// The built parts reach the store's React through globalThis at render time only, so node can import them as they are.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pluginsDir } from "./lib/store.mjs";

const file = process.argv[2] || "znode-package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
const outDir = file === "znode-package.json" ? "dist" : `dist-${pkg.name}`;
const built = (part) => path.join(outDir, `${pkg.name}-${pkg.version}.${part}.mjs`);

const load = async (part) => (fs.existsSync(built(part)) ? (await import(pathToFileURL(path.resolve(built(part))).href)).default : undefined);
const names = (value) => (value && typeof value === "object" ? Object.keys(value) : []);
const list = (items) => (items.length ? items.join(", ") : "–");

const rows = [];
const row = (what, items, where = "") => rows.push([what, Array.isArray(items) ? list(items) : String(items), where]);

// the parent chain, from the registry when the parents are installed there
const chain = [pkg.name];
try {
  const registry = JSON.parse(fs.readFileSync(path.join(pluginsDir(), "plugins.json"), "utf8"));
  const entries = Array.isArray(registry) ? registry : registry.plugins || [];
  let parent = pkg.parent;
  while (parent && !chain.includes(parent)) {
    chain.push(parent);
    parent = entries.find((entry) => entry.name === parent)?.parent;
  }
} catch {
  if (pkg.parent) chain.push(pkg.parent);
}

row("Package", `${pkg.name}@${pkg.version} (${pkg.kind})`, file);
if (pkg.kind === "theme") row("Theme chain", chain.join(" → "), "parent");
row("Permissions", pkg.permissions || []);
row("Settings", Object.entries(pkg.settingsSchema || {}).map(([key, spec]) => `${key} (${spec.type}${spec.browser ? ", browser" : ""}${spec.attribute ? `, attribute ${spec.attribute}` : ""}${spec.required ? ", required" : ""})`), "settingsSchema");
row("Labels", pkg.messages ? names(JSON.parse(fs.readFileSync(pkg.messages, "utf8"))).map((space) => `${space}.*`) : [], pkg.messages || "");
row("Styles", [].concat(pkg.styles || []), "styles");
row("Assets", [].concat(pkg.assets || []), "assets");
row("Pages (page-builder content)", names(pkg.pages), "pages");

const browser = await load("browser");
const browserPart = typeof browser === "function" ? browser({ settings: {}, store: {} }) : browser;
row("Browser slots", names(browserPart?.slots), pkg.build?.browser || "src/browser.tsx");
row("Browser transforms", names(browserPart?.transforms), "");
row("Widgets", names(browserPart?.widgets), "");

const server = await load("server");
row("Server slots", names(server?.serverSlots), pkg.build?.server || "src/server.tsx");
row("Server pages (own URLs)", names(server?.serverPages), "");
row("Routes (/api/extensions/plugins/<name>/<route>)", names(server?.routes), "");
row("Cart hooks", names(server?.hooks).filter((hook) => typeof server.hooks[hook] === "function"), "");
row("Route overrides", names(pkg.overrides), "overrides");

const width = Math.max(...rows.map(([what]) => what.length));
for (const [what, items, where] of rows) console.log(`${what.padEnd(width)}  ${items}${where ? `   [${where}]` : ""}`);
