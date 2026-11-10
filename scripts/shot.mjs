// Screenshot a store page with this theme previewed (or without it), for the before/after images of a scenario.
//   node scripts/shot.mjs --path / --out docs/scenarios/008/after.png
//   node scripts/shot.mjs --path /category/1 --out x.png --theme none        (the store's own theme, no preview)
//   node scripts/shot.mjs --path / --out x.png --width 375 --height 812      (phone width)
//   node scripts/shot.mjs --path / --out x.png --full                        (the whole page, not just the first screen)
//   node scripts/shot.mjs --path / --out x.png --selector "[data-test-selector=divAnnouncement]"   (one element)
//   node scripts/shot.mjs --text output.txt --title "npm run deploy" --out x.png   (a command's output, as evidence)
// STORE_URL (default http://localhost:3000) is the running webstore in development mode; EDGE_PATH the browser to drive.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value === undefined || value.startsWith("--") ? true : value;
};

const store = (process.env.STORE_URL || "http://localhost:3000").replace(/\/$/, "");
const pagePath = String(arg("path", "/"));
const out = arg("out");
const theme = String(arg("theme", "spp-customization"));
const width = Number(arg("width", 1366));
const height = Number(arg("height", 900));
const wait = Number(arg("wait", 2500));
const selector = arg("selector");
if (!out || out === true) {
  console.error("needs --out <file.png>");
  process.exit(1);
}

const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: edge, headless: true, args: ["--hide-scrollbars", "--disable-gpu"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: width < 768, hasTouch: width < 768 });
  const textFile = arg("text");
  if (textFile && textFile !== true) {
    // a command's output as a terminal-like card: the evidence image of a scenario with nothing to see on a page
    const escape = (value) => String(value).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    const title = arg("title", path.basename(textFile));
    const text = fs.readFileSync(textFile, "utf8").replace(/\x1b\[[0-9;]*m/g, "");
    await page.setViewport({ width: 1100, height: 200 });
    await page.setContent(
      `<body style="margin:0;padding:24px;background:#0f172a;font:14px/1.5 Consolas,monospace;color:#e2e8f0">` +
        `<div style="color:#93c5fd;margin-bottom:12px">${escape(title)}</div><pre style="margin:0;white-space:pre-wrap">${escape(text)}</pre></body>`
    );
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    console.log(out);
    await browser.close();
    process.exit(0);
  }
  // the preview switch sets its cookie, then redirects to the page; "none" clears it
  // --url <absolute URL>: open that page as it is (another app, e.g. the page builder on :3001), no preview switch
  const url = arg("url");
  const start =
    url && url !== true
      ? String(url)
      : theme === "none"
        ? `${store}/api/extensions/preview?to=${encodeURIComponent(pagePath)}`
        : `${store}/api/extensions/preview?theme=${encodeURIComponent(theme)}&to=${encodeURIComponent(pagePath)}`;
  await page.goto(start, { waitUntil: "load", timeout: 120000 });
  await new Promise((resolve) => setTimeout(resolve, wait));
  // --scroll <px>: scroll the page first (lazy parts load); --hover <selector>: hold the mouse over an element
  const scroll = Number(arg("scroll", 0));
  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  const hover = arg("hover");
  if (hover && hover !== true) {
    await page.hover(hover);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  if (selector && selector !== true) {
    const element = await page.waitForSelector(selector, { timeout: 15000 });
    await element.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: Boolean(arg("full", false)) });
  }
  console.log(`${out}  (${page.url()})`);
} finally {
  await browser.close();
}
