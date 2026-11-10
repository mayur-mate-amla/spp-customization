// Drives the page builder for a scenario's screenshots: drag a widget from the component list onto the page, select it,
// optionally type into one of its fields, and screenshot the editor. It publishes only with --publish (that writes the
// page to the store's CMS in Znode: shared content).
//   node scripts/editor.mjs --store POCSppDemo --widget "FAQ accordion" --out docs/x/editor.png
//   node scripts/editor.mjs --store POCSppDemo --widget "FAQ accordion" --field Heading --type "Shipping questions" --out x.png
//   node scripts/editor.mjs --store POCSppDemo --widget "Your account manager" --publish --out x.png
//   node scripts/editor.mjs --store POCSppDemo --out x.png                     (no widget: just open the page, e.g. after a publish)
//   node scripts/editor.mjs --query "url=layout&pageCode=Footer" --widget ... --out x.png   (another page: the footer layout)
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
// the editor's page: the home page unless --query names another ("url=layout&pageCode=Footer" for the store's footer)
const query = arg("query", "url=home");
const widget = arg("widget");
const out = arg("out");
const field = arg("field");
const text = arg("type");
// --publish-local <file.json>: press the editor's Publish, but block every write request it makes (nothing reaches the
// Znode CMS) and save the page JSON it tried to send into <file.json>, a page file of a package of this repo.
// --publish (real CMS publish) is refused unless ALLOW_CMS_PUBLISH=yes: CMS content is shared.
const publishLocal = arg("publish-local");
const publish = args.includes("--publish") || Boolean(publishLocal);
if (args.includes("--publish") && process.env.ALLOW_CMS_PUBLISH !== "yes") throw new Error("--publish writes to the shared Znode CMS; use --publish-local <file.json>");
if (!out) throw new Error('usage: --out <file.png> [--widget "<label in the list>"] [--store X] [--field <label> --type <text>] [--publish]');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await puppeteer.launch({ executablePath: edge, headless: true, args: ["--hide-scrollbars", "--disable-gpu"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: Number(arg("height", 1000)) });
  await page.goto(`${base}/en-US/page-builder?${query}&storeCode=${encodeURIComponent(store)}`, { waitUntil: "load", timeout: 120000 });
  await sleep(20000);

  if (widget) await dropWidget(page);

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

  // publish: the editor's Publish button, then a confirmation if the editor asks for one; the API calls it makes are
  // printed (method, path, status) as the evidence of what was written
  if (publish) {
    const calls = [];
    const blocked = [];
    if (publishLocal) {
      // from here on, no write request leaves the browser: each is recorded and aborted
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (request.method() === "GET" || request.method() === "HEAD" || request.method() === "OPTIONS") return void request.continue();
        blocked.push({ method: request.method(), path: new URL(request.url()).pathname, body: request.postData() || "" });
        request.abort();
      });
    }
    page.on("response", (response) => {
      const request = response.request();
      if (["POST", "PUT", "PATCH"].includes(request.method())) calls.push(`${request.method()} ${new URL(response.url()).pathname} -> ${response.status()}`);
    });
    const clickButton = (labels) =>
      page.evaluate((names) => {
        const visible = (element) => element.getClientRects().length > 0;
        // the editor's buttons are spans styled as buttons (the Publish one included)
        const candidates = [...document.querySelectorAll("button, [role=button], a, span[class*='_Button']")];
        const button = candidates.find((element) => names.includes((element.innerText || element.textContent || "").trim()) && visible(element));
        button?.click();
        return button ? (button.innerText || button.textContent).trim() : "";
      }, labels);
    const clicked = await clickButton(["Publish"]);
    if (!clicked) throw new Error("no Publish button");
    await sleep(2000);
    const confirmed = await clickButton(["Confirm", "Yes", "Publish now", "OK"]);
    await sleep(8000);
    console.log(`clicked: ${clicked}${confirmed ? `, then ${confirmed}` : ""}`);
    console.log(calls.length ? calls.join("\n") : "no POST/PUT/PATCH completed");
    if (publishLocal) {
      for (const call of blocked) console.log(`blocked (not sent): ${call.method} ${call.path} (${call.body.length} bytes)`);
      // the page JSON: the first object in a blocked body (or nested in it) with the page builder's "content" array
      const findPage = (value) => {
        if (!value || typeof value !== "object") return null;
        if (Array.isArray(value.content) && value.root) return value;
        for (const child of Object.values(value)) {
          const parsed = typeof child === "string" && child.trim().startsWith("{") ? (() => { try { return JSON.parse(child); } catch { return null; } })() : child;
          const found = findPage(parsed);
          if (found) return found;
        }
        return null;
      };
      let pageJson = null;
      for (const call of blocked) {
        try {
          pageJson = findPage(JSON.parse(call.body));
        } catch {
          pageJson = null;
        }
        if (pageJson) break;
      }
      if (!pageJson) throw new Error("no page JSON in the blocked requests (nothing was saved, nothing was sent)");
      fs.mkdirSync(path.dirname(path.resolve(publishLocal)), { recursive: true });
      fs.writeFileSync(publishLocal, JSON.stringify({ root: pageJson.root, content: pageJson.content, zones: pageJson.zones || {} }, null, 2) + "\n");
      console.log(`saved locally: ${publishLocal} (${pageJson.content.length} blocks: ${pageJson.content.map((item) => item.type).join(", ")})`);
    }
  }

  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => undefined);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  console.log(out);
} finally {
  await browser.close();
}

async function dropWidget(page) {
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
  // a nested drop zone (the footer's) only takes the drop once the pointer has moved inside it: a few small moves
  for (let step = 0; step < 10; step++) {
    await page.mouse.move(end.x + (step % 2 ? 10 : -10), end.y + step);
    await sleep(80);
  }
  await sleep(400);
  // --drag-shot <file.png>: the editor while the widget is held over the drop point (to place a drop)
  if (arg("drag-shot")) await page.screenshot({ path: arg("drag-shot") });
  await page.mouse.up();
  await sleep(4000);
}
