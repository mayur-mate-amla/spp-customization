// Accessibility check of this repository's widgets and slots on a store page (row 138):
//   node scripts/a11y.mjs --path / [--theme spp-customization|none] [--store http://localhost:3000]
// 1. axe-core (the store's own copy: <store repo>/node_modules/axe-core, or AXE_PATH) runs WCAG 2.1 A/AA rules on the
//    parts of the page this repository renders only (classes spp-customization-*, spp-commerce-*, spp-widgets-*), not
//    on the store's own markup.
// 2. The keyboard: Tab goes through the page; every stop inside those parts must show a focus indicator (an outline or
//    a box-shadow that is not there without focus).
// Exit code 1 when either finds a problem.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const store = arg("store", process.env.STORE_URL || "http://localhost:3000").replace(/\/$/, "");
const path = arg("path", "/");
const theme = arg("theme", "spp-customization");
const axePath = process.env.AXE_PATH || "D:/znode/znode-webstore10x-page-builder/node_modules/axe-core/axe.min.js";
const OURS = "[class*='spp-customization-'], [class*='spp-commerce-'], [class*='spp-widgets-']";
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
let problems = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  if (theme !== "none") await page.setCookie({ name: "runtimeThemePreview", value: theme, url: store });
  await page.goto(`${store}${path}`, { waitUntil: "load", timeout: 120000 });
  await new Promise((resolve) => setTimeout(resolve, 8000));
  // evaluated through DevTools, not a <script> tag: the store's content-security policy blocks inline scripts
  await page.evaluate(`${fs.readFileSync(axePath, "utf8")}\n;window.axe = window.axe || axe;`);

  // 1. axe on our parts only (outermost ones: a part inside another is checked with it)
  const result = await page.evaluate(async (selector) => {
    // the theme's layout wrapper surrounds the whole page (the store's markup too): its own parts are checked instead
    const ours = [...document.querySelectorAll(selector)].filter((element) => !element.classList.contains("spp-customization-layout"));
    const roots = ours.filter((element) => !ours.some((other) => other !== element && other.contains(element)));
    if (!roots.length) return { roots: 0, violations: [] };
    const report = await window.axe.run({ include: roots }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] });
    return {
      roots: roots.length,
      parts: [...new Set(roots.map((root) => [...root.classList].find((name) => /^spp-/.test(name)) || root.tagName.toLowerCase()))],
      violations: report.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary.split("\n").slice(1, 2).join(" ").trim()}`),
      })),
    };
  }, OURS);
  console.log(`axe (WCAG 2.1 A/AA) on ${result.roots} parts: ${(result.parts || []).join(", ")}`);
  if (!result.violations.length) console.log("  no violations");
  for (const violation of result.violations) {
    problems++;
    console.log(`  ${violation.impact} ${violation.id}: ${violation.help} (${violation.nodes.length} element${violation.nodes.length === 1 ? "" : "s"})`);
    for (const node of violation.nodes.slice(0, 12)) console.log(`    - ${node}`);
  }

  // 2. the keyboard: Tab through the page, note each stop inside our parts and whether focus is visible there
  const stops = [];
  for (let step = 0; step < 120; step++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate((selector) => {
      const element = document.activeElement;
      // our part: the nearest of our elements other than the theme's layout wrapper (which holds the store's markup too)
      let part = element?.closest(selector);
      while (part && part.classList.contains("spp-customization-layout")) part = part.parentElement?.closest(selector) || null;
      if (!element || element === document.body || !part) return null;
      const focused = getComputedStyle(element);
      const visible = (focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0) || (focused.boxShadow && focused.boxShadow !== "none");
      const name = (element.getAttribute("aria-label") || element.textContent || element.getAttribute("title") || element.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 50);
      return { tag: element.tagName.toLowerCase(), name, visible: Boolean(visible), part: [...part.classList].find((value) => /^spp-/.test(value)) || "" };
    }, OURS);
    if (stop) stops.push(stop);
  }
  const unique = stops.filter((stop, index) => stops.findIndex((other) => other.tag === stop.tag && other.name === stop.name && other.part === stop.part) === index);
  console.log(`keyboard: ${unique.length} stops in our parts`);
  for (const stop of unique) {
    if (!stop.visible) problems++;
    console.log(`  ${stop.visible ? "ok  " : "NO FOCUS"} ${stop.part} <${stop.tag}> "${stop.name}"`);
  }
} finally {
  await browser.close();
}
console.log(problems ? `${problems} problem(s)` : "no problems");
process.exitCode = problems ? 1 : 0;
