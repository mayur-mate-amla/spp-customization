// Does script inside a package's SVG run in a shopper's browser (row 168)? Loads an SVG from the store's files route
// the ways a page or a shopper can, in Edge, and reports for each whether its script or onload ran:
//   node scripts/svg-check.mjs [--file spp-sandbox-probe-script.svg] [--store http://sppdemo.localhost:3000] [--out shot.png]
// The SVG must mark its document when its script runs (data-ran on its root element, a new document.title), as the test
// image of the spp-sandbox-probe package does (src/sandbox-probe/spp-sandbox-probe-script.svg).
//   direct     the SVG opened as a page (a link to it, a new tab)
//   iframe     <iframe src> in a store page
//   object     <object data> in a store page
//   embed      <embed src> in a store page
//   img        <img src> in a store page (no script by design)
//   inline     its markup put into a store page with innerHTML (a package that inlines icons this way)
//   control    the same markup in a page with no CSP: its script must run there, or the check could not see a run
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const store = arg("store", "http://sppdemo.localhost:3000").replace(/\/$/, "");
const file = arg("file", "spp-sandbox-probe-script.svg");
const out = arg("out", "");
const url = `${store}/api/extensions/files/${file}`;
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
const results = [];
const blocked = [];
const watch = (page) => page.on("console", (message) => /Refused|Content Security Policy|sandbox|Blocked script/i.test(message.text()) && blocked.push(message.text().slice(0, 160)));
try {
  // direct
  const direct = await browser.newPage();
  watch(direct);
  const response = await direct.goto(url, { waitUntil: "load", timeout: 120000 });
  await wait(1000);
  const directState = await direct.evaluate(() => ({ ran: document.documentElement.getAttribute("data-ran") || "", title: document.title, origin: String(self.origin) }));
  results.push(["direct", `${directState.ran ? `RAN (${directState.ran})` : "did not run"}; document origin ${directState.origin}; CSP ${response.headers()["content-security-policy"] || "(none)"}`, !directState.ran]);
  await direct.close();

  // embedded in a store page
  const page = await browser.newPage();
  watch(page);
  await page.setViewport({ width: 1100, height: 520 });
  await page.goto(`${store}/`, { waitUntil: "networkidle2", timeout: 180000 });
  const titleBefore = await page.title();
  const svgText = await (await fetch(url.replace(/^http:\/\/[^/]+/, "http://127.0.0.1:3000"), { headers: { Host: new URL(store).host } })).text();
  await page.evaluate(
    (src, markup) => {
      document.body.innerHTML = "";
      const box = document.createElement("div");
      box.style.cssText = "display:grid;grid-template-columns:repeat(5,200px);gap:12px;padding:16px;font:13px sans-serif";
      const cell = (label, element) => {
        const wrap = document.createElement("figure");
        wrap.style.margin = "0";
        wrap.append(element);
        const caption = document.createElement("figcaption");
        caption.textContent = label;
        wrap.append(caption);
        box.append(wrap);
      };
      const make = (tag, attributes) => Object.assign(document.createElement(tag), attributes);
      cell("iframe", make("iframe", { src, width: 200, height: 70, id: "svg-iframe" }));
      cell("object", make("object", { data: src, type: "image/svg+xml", width: 200, height: 70, id: "svg-object" }));
      cell("embed", make("embed", { src, type: "image/svg+xml", width: 200, height: 70, id: "svg-embed" }));
      cell("img", make("img", { src, width: 200, height: 50 }));
      const inline = document.createElement("div");
      inline.id = "svg-inline";
      inline.innerHTML = markup;
      cell("inline (innerHTML)", inline);
      document.body.append(box);
    },
    url,
    svgText,
  );
  await wait(4000);
  for (const frame of page.frames().filter((item) => item !== page.mainFrame())) {
    const owner = await frame.frameElement();
    const id = owner ? await owner.evaluate((element) => element.id || element.tagName.toLowerCase()) : "frame";
    const state = await frame.evaluate(() => ({ ran: document.documentElement?.getAttribute("data-ran") || "", origin: String(self.origin) })).catch((error) => ({ ran: "", origin: `(not readable: ${error.message.slice(0, 60)})` }));
    results.push([id.replace("svg-", ""), `${state.ran ? `RAN (${state.ran})` : "did not run"}; document origin ${state.origin}`, !state.ran]);
  }
  for (const id of ["svg-iframe", "svg-object", "svg-embed"]) {
    if (!results.some(([mode]) => mode === id.replace("svg-", ""))) results.push([id.replace("svg-", ""), "no document of its own to run in (not loaded as a frame)", true]);
  }
  results.push(["img", "an image: browsers never run script in <img>", true]);
  const inlineState = await page.evaluate(() => ({ ran: document.querySelector("#svg-inline svg")?.getAttribute("data-ran") || document.documentElement.getAttribute("data-ran") || "", title: document.title }));
  const inlineRan = inlineState.ran || inlineState.title !== titleBefore;
  results.push(["inline", `${inlineRan ? `RAN (${inlineState.ran || `title now "${inlineState.title}"`})` : "did not run"} (the page's own CSP: a nonce, so 'unsafe-inline' is ignored)`, !inlineRan]);
  if (out) await page.screenshot({ path: out });
  await page.close();

  // control: the same markup in a page with no Content-Security-Policy, where its script must run; if it does not, the
  // checks above could not have seen a run either
  const control = await browser.newPage();
  await control.setContent(`<!doctype html><html><head><title>control</title></head><body>${svgText}</body></html>`, { waitUntil: "load" });
  await wait(1000);
  const controlState = await control.evaluate(() => ({ ran: document.documentElement.getAttribute("data-ran") || "", title: document.title }));
  results.push(["control", `${controlState.ran ? `ran (${controlState.ran}, title "${controlState.title}"): the check sees a run` : "DID NOT RUN: this check cannot see a run"} (same markup, a page with no CSP)`, Boolean(controlState.ran)]);
  await control.close();
} finally {
  await browser.close();
}

console.log(`${url}`);
for (const [mode, text, ok] of results) console.log(`${ok ? "ok  " : "FAIL"} ${mode.padEnd(8)} ${text}`);
if (blocked.length) {
  console.log("browser console:");
  for (const line of [...new Set(blocked)].slice(0, 6)) console.log(`  ${line}`);
}
const failed = results.filter(([, , ok]) => !ok).length;
console.log(failed ? `${failed} way(s) ran the SVG's script` : "the SVG's script ran in none of them");
process.exit(failed ? 1 : 0);
