// Sends a signed ERP stock event to spp-commerce's webhook, as the ERP would: the body signed with HMAC-SHA256 and the
// shared secret (the plugin's erpWebhookSecret setting), in X-Erp-Signature: sha256=<hex>.
//   ERP_SECRET=<secret> node scripts/erp-webhook.mjs '{"sku":"817NK_25","available":false,"backOn":"2026-12-01"}'
//   ERP_SECRET=<secret> node scripts/erp-webhook.mjs '{"sku":"817NK_25","available":true}'      (the hold is over)
// STORE_URL (default http://sppdemo.localhost:3000) is the store; Node cannot resolve *.localhost, so the request goes
// to 127.0.0.1 with the store's Host header.
import { createHmac } from "node:crypto";
import http from "node:http";

const body = process.argv[2];
const secret = process.env.ERP_SECRET;
if (!body || !secret) {
  console.error("usage: ERP_SECRET=<secret> node scripts/erp-webhook.mjs '<json body>'");
  process.exit(1);
}
JSON.parse(body); // a typo fails here, not at the store

const store = new URL(process.env.STORE_URL || "http://sppdemo.localhost:3000");
const signature = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
const request = http.request(
  {
    host: "127.0.0.1",
    port: store.port || 80,
    path: "/api/extensions/plugins/spp-commerce/erp-stock",
    method: "POST",
    headers: { Host: store.host, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "X-Erp-Signature": signature },
  },
  (response) => {
    let text = "";
    response.on("data", (chunk) => (text += chunk));
    response.on("end", () => {
      console.log(`HTTP ${response.statusCode} ${text}`);
      process.exitCode = response.statusCode === 200 ? 0 : 1;
    });
  },
);
request.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
request.end(body);
