// Fills a fresh cart and screenshots the cart page: the evidence for the cart rules (onCartChanged, mapCartItems).
//   node scripts/cart-shot.mjs --add 103809:8 [--add 103946:1 ...] [--remove 103946] [--reload] --out x.png
//   --add <productId>:<qty>  opens the product page, sets the quantity, clicks "Add to cart" (in order)
//   --remove <productId>     on the cart page, removes that product's line, then reads the cart again
//   --route <path>           also prints what GET <path> answers (e.g. a plugin route) after the cart is shown
// STORE_URL picks the store (default http://sppdemo.localhost:3000). Each run is a new browser, so a new cart.
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const all = (flag) => args.flatMap((value, index) => (args[index - 1] === flag ? [value] : []));
const one = (flag, fallback) => all(flag)[0] ?? fallback;
const store = process.env.STORE_URL || "http://sppdemo.localhost:3000";
const out = one("--out", "cart.png");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const edge = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  for (const add of all("--add")) {
    const [id, qty = "1"] = add.split(":");
    await page.goto(`${store}/product/${id}`, { waitUntil: "load", timeout: 120000 });
    await page.waitForSelector(`[data-test-selector=btnAddToCart${id}]`, { timeout: 60000 });
    await wait(2500);
    const box = await page.$("[data-test-selector=txtProductQuantity]");
    if (box && qty !== "1") {
      await box.click({ clickCount: 3 });
      await box.type(qty);
    }
    await page.click(`[data-test-selector=btnAddToCart${id}]`);
    await wait(5000);
    console.log(`added product ${id} x ${qty}`);
  }

  const showCart = async () => {
    await page.goto(`${store}/cart`, { waitUntil: "load", timeout: 120000 });
    await page.waitForSelector("[data-test-selector^=paraOrderRowTotal]", { timeout: 60000 }).catch(() => undefined);
    await wait(4000);
  };
  await showCart();

  for (const id of all("--remove")) {
    const remove = (await page.$(`[data-test-selector=btnRemoveCartItem${id}]`)) || (await page.$(`[data-test-selector=linkRemoveCartItem${id}]`));
    if (!remove) throw new Error(`no remove button for product ${id}`);
    await remove.click();
    await wait(5000);
    console.log(`removed product ${id}`);
    await showCart();
  }

  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((node) => node.remove()));
  const lines = await page.$$eval("[data-test-selector^=linkProductName]", (links) =>
    links.map((link) => {
      const row = link.closest("[class*=grid]")?.parentElement || link.parentElement;
      const qty = row?.querySelector("input[data-test-selector^=txtProductRowQuantity]");
      return `${link.textContent?.trim()} | qty ${qty?.value ?? "?"}`;
    }),
  ).catch(() => []);
  console.log(lines.length ? lines.join("\n") : "(no cart lines)");

  const route = one("--route");
  if (route) console.log(await page.evaluate(async (path) => (await fetch(path)).text(), route));

  await page.screenshot({ path: out, fullPage: args.includes("--full") });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
