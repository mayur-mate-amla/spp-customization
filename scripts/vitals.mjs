// Core Web Vitals of a store page, measured in Edge with the browser's own performance APIs (rows 147-148):
//   node scripts/vitals.mjs --path / [--store <url>] [--theme <name>|none] [--runs 3] [--throttle]
// Reports FCP, LCP, CLS (with the elements that moved, the largest shifts first) and TBT (long tasks over 50 ms after
// FCP), the median of --runs page loads in a new browser each time. --throttle emulates a mid-range phone on 4G
// (CPU 4x slower, 150 ms RTT, 1.6 Mbps down) as Lighthouse's mobile run does. A store in development mode is far slower
// than its production build: compare runs with each other (with and without a package), not with field targets.
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const store = arg("store", process.env.STORE_URL || "http://localhost:3000").replace(/\/$/, "");
const pagePath = arg("path", "/");
const theme = arg("theme", "none");
const runs = Number(arg("runs", 3));
const throttle = args.includes("--throttle");
// --film <out.png>: one more page load, screenshotted every 250 ms from the first paint, laid out as a strip with the
// time of each frame (shows a layout shift as it happens)
const film = arg("film", "");
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// installed before any page script: collects the entries as they happen
const OBSERVE = () => {
  const vitals = { fcp: 0, lcp: 0, cls: 0, shifts: [], longTasks: [] };
  window.__vitals = vitals;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (entry.name === "first-contentful-paint") vitals.fcp = entry.startTime;
  }).observe({ type: "paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) vitals.lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      vitals.cls += entry.value;
      const sources = (entry.sources || []).map((source) => {
        const node = source.node;
        if (!node || !node.closest) return "(gone)";
        const label = (element) => `${element.tagName.toLowerCase()}${element.className && typeof element.className === "string" ? "." + element.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
        // the nearest element of a package (excluding the theme's page-wide wrapper), else the node itself
        const ours = node.closest("[class*='spp-customization-']:not(.spp-customization-layout), [class*='spp-commerce-'], [class*='spp-widgets-'], [class*='spp-promos']");
        const moved = `${Math.round(source.previousRect.y)}→${Math.round(source.currentRect.y)}px`;
        return `${ours ? `${label(ours)} (ours)` : label(node)} ${moved}`;
      });
      vitals.shifts.push({ at: Math.round(entry.startTime), value: entry.value, sources });
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) vitals.longTasks.push({ start: entry.startTime, duration: entry.duration });
  }).observe({ type: "longtask", buffered: true });
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const results = [];
for (let run = 0; run < runs; run++) {
  const browser = await puppeteer.launch({ executablePath: edge, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
    if (theme !== "none") await page.setCookie({ name: "runtimeThemePreview", value: theme, url: store });
    if (throttle) {
      const cdp = await page.createCDPSession();
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await page.evaluateOnNewDocument(OBSERVE);
    await page.goto(`${store}${pagePath}`, { waitUntil: "load", timeout: 180000 });
    await new Promise((resolve) => setTimeout(resolve, 8000));
    const vitals = await page.evaluate(() => window.__vitals);
    vitals.tbt = vitals.longTasks.filter((task) => task.start >= vitals.fcp).reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
    results.push(vitals);
  } finally {
    await browser.close();
  }
}

const pick = (key) => median(results.map((result) => result[key]));
console.log(`${store}${pagePath}${theme !== "none" ? ` (theme ${theme})` : ""}, ${runs} runs${throttle ? ", phone on 4G (CPU 4x, 150 ms, 1.6 Mbps)" : ", no throttling"}, phone viewport`);
console.log(`  FCP ${Math.round(pick("fcp"))} ms   LCP ${Math.round(pick("lcp"))} ms   CLS ${pick("cls").toFixed(3)}   TBT ${Math.round(pick("tbt"))} ms`);
// the shifts of the run with the median CLS, largest first, with what moved
const typical = results.find((result) => result.cls === pick("cls")) || results[0];
for (const shift of [...typical.shifts].sort((a, b) => b.value - a.value).slice(0, 8)) {
  console.log(`  shift ${shift.value.toFixed(3)} at ${shift.at} ms: ${[...new Set(shift.sources)].join(", ") || "(no source)"}`);
}

if (film) {
  const browser = await puppeteer.launch({ executablePath: edge, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 823, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    if (theme !== "none") await page.setCookie({ name: "runtimeThemePreview", value: theme, url: store });
    await page.evaluateOnNewDocument(OBSERVE);
    const frames = [];
    const loading = page.goto(`${store}${pagePath}`, { waitUntil: "load", timeout: 180000 });
    // wait for the first paint, then a frame every 250 ms until the page has been still for a while
    const started = Date.now();
    while (Date.now() - started < 180000 && !(await page.evaluate(() => window.__vitals && window.__vitals.fcp).catch(() => 0))) await new Promise((resolve) => setTimeout(resolve, 50));
    let last = "";
    let still = 0;
    while (frames.length < 40 && still < 12) {
      const at = Math.round(await page.evaluate(() => performance.now()));
      const shot = await page.screenshot({ encoding: "base64", clip: { x: 0, y: 0, width: 412, height: 640 } });
      if (shot !== last) {
        frames.push({ at, shot });
        still = 0;
      } else still++;
      last = shot;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await loading.catch(() => undefined);
    // the frames where something changed, at most 8 spread over the load
    const picked = frames.length <= 8 ? frames : Array.from({ length: 8 }, (_, index) => frames[Math.round((index * (frames.length - 1)) / 7)]);
    const strip = await browser.newPage();
    await strip.setViewport({ width: picked.length * 216 + 16, height: 400, deviceScaleFactor: 1 });
    await strip.setContent(`<body style="margin:0;padding:8px;font:13px system-ui;background:#f3f4f6;display:flex;gap:8px">${picked
      .map((frame) => `<figure style="margin:0;width:208px"><img src="data:image/png;base64,${frame.shot}" style="width:208px;border:1px solid #9ca3af;display:block"><figcaption style="padding:4px 2px">${frame.at} ms after the page started</figcaption></figure>`)
      .join("")}</body>`);
    await strip.screenshot({ path: film, fullPage: true });
    console.log(`filmstrip: ${film} (${picked.length} frames)`);
  } finally {
    await browser.close();
  }
}
