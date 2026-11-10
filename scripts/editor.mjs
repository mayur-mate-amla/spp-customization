// Drives the page builder for a scenario's screenshots: drag a widget from the component list onto the page, select it,
// optionally type into one of its fields, and screenshot the editor. It never publishes.
//   node scripts/editor.mjs --store POCSppDemo --widget "FAQ accordion" --out docs/x/editor.png
//   node scripts/editor.mjs --store POCSppDemo --widget "FAQ accordion" --field Heading --type "Shipping questions" --out x.png
// PAGE_BUILDER_URL (default http://localhost:3001) is the running page builder; EDGE_PATH the browser to drive.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const base = (process.env.PAGE_BUILDER_URL || "http://localhost:3001").replace(/\/$/, "");
const store = arg("store", "POCSppDemo");
const widget = arg("widget");
const out = arg("out");
const field = arg("field");
const text = arg("type");
if (!widget || !out) throw new Error('usage: --widget "<label in the list>" --out <file.png> [--store X] [--field <label> --type <text>]');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: edge, headless: true, args: ["--hide-scrollbars", "--disable-gpu"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  await page.goto(`${base}/en-US/page-builder?url=home&storeCode=${encodeURIComponent(store)}`, { waitUntil: "load", timeout: 120000 });
  await sleep(20000);

  // the widget in the component list (the innermost element with exactly that label)
  const handle = await page.evaluateHandle((label) => {
    const all = [...document.querySelectorAll("body *")].filter((element) => element.children.length === 0 && element.textContent.trim() === label);
    const item = all[0];
    item?.scrollIntoView({ block: "center" });
    return item?.closest("[data-rfd-draggable-id], [draggable], [role=button], div") || item;
  }, widget);
  await sleep(600);
  const from = await handle.boundingBox();
  if (!from) throw new Error(`"${widget}" is not in the component list`);

  // the page canvas (an iframe), dropped near its top so the new block lands first
  const frameElement = await page.$("iframe");
  const to = await frameElement.boundingBox();
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + Number(arg("dropY", 560)) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await sleep(250);
  // a small first move starts the drag (the editor's drag library waits for the pointer to travel a few pixels)
  await page.mouse.move(start.x + 12, start.y + 4, { steps: 4 });
  await sleep(250);
  for (let step = 1; step <= 30; step++) {
    await page.mouse.move(start.x + ((end.x - start.x) * step) / 30, start.y + ((end.y - start.y) * step) / 30);
    await sleep(30);
  }
  await sleep(400);
  await page.mouse.up();
  await sleep(4000);

  // type into one of the selected widget's fields (the right-hand panel), to show the canvas following the edit
  if (field && text !== undefined) {
    const input = await page.evaluateHandle((label) => {
      const labels = [...document.querySelectorAll("label, div, span")].filter((element) => element.children.length <= 2 && element.textContent.trim() === label);
      for (const element of labels) {
        const container = element.closest("label") || element.parentElement;
        const control = container?.querySelector("input, textarea") || container?.parentElement?.querySelector("input, textarea");
        if (control) return control;
      }
      return null;
    }, field);
    if (!(await input.evaluate((element) => Boolean(element)))) throw new Error(`no field "${field}" in the panel`);
    await input.click({ clickCount: 3 });
    await page.keyboard.type(text, { delay: 20 });
    await sleep(2500);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  console.log(out);
} finally {
  await browser.close();
}
