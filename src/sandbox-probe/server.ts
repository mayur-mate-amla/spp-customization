import type { IPluginRouteContext, IPluginRouteRequest, IRuntimePlugin } from "znode-plugin/types/extension-api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// spp-sandbox-probe (row 165): what a plugin's server code can reach, run once in the webstore process (a normal
// package) and once in the store's sandbox (registry entry "sandbox": true). One route,
//   GET /api/extensions/plugins/spp-sandbox-probe/probe
// answers yes/no for each thing a hostile partner package would try. It never returns what it read: only whether the
// read worked (and, for the registry, whether another package's secret setting name was in it). It is a test package:
// installed on one store for the check, then uninstalled.
//   GET .../probe?heap=1   also allocates memory until the process runs out (the sandbox's heap limit)

type ICheck = { check: string; ok: boolean; detail: string };

function attempt(check: string, run: () => string): ICheck {
  try {
    return { check, ok: true, detail: run() };
  } catch (error) {
    const code = (error as { code?: string }).code;
    return { check, ok: false, detail: code || String((error as Error).message || error).slice(0, 120) };
  }
}

// the folder this bundle was loaded from (the store's plugin folder) and the store's working folder
const bundleFile = (() => {
  try {
    return fileURLToPath(import.meta.url).replace(/\?.*$/, "");
  } catch {
    return "";
  }
})();
const pluginFolder = path.dirname(bundleFile);

async function probe(request: IPluginRouteRequest, context: IPluginRouteContext) {
  const env = process.env;
  const checks: ICheck[] = [
    attempt("where it runs", () => `pid ${process.pid}, ${process.execArgv.some((arg) => arg.startsWith("--permission")) ? "Node permission model on" : "no permission model"}`),
    attempt("environment variables", () => {
      const names = Object.keys(env);
      const secretNames = names.filter((name) => /SECRET|API_KEY|PASSWORD|TOKEN/i.test(name));
      if (!secretNames.length && names.length < 5) throw new Error(`only ${names.length}: ${names.join(", ")}`);
      return `${names.length} visible, ${secretNames.length} named like secrets (${secretNames.slice(0, 4).join(", ")})`;
    }),
    attempt("read its own bundle", () => `${fs.readFileSync(bundleFile).length} bytes`),
    attempt("read plugins.json (every package's settings)", () => {
      const text = fs.readFileSync(path.join(pluginFolder, "plugins.json"), "utf8");
      return `${text.length} bytes; another package's secret setting in it: ${/erpWebhookSecret|staffKey/.test(text) ? "yes" : "no"}`;
    }),
    attempt("read another package's server bundle", () => {
      const other = fs.readdirSync(pluginFolder).find((name) => name.endsWith(".server.mjs") && !name.startsWith("spp-sandbox-probe"));
      return `${other}: ${fs.readFileSync(path.join(pluginFolder, String(other))).length} bytes`;
    }),
    attempt("read the store's .env", () => `${fs.readFileSync(path.join(process.cwd(), ".env")).length} bytes (${path.join(process.cwd(), ".env")})`),
    attempt("write a file", () => {
      const file = path.join(os.tmpdir(), `spp-sandbox-probe-${process.pid}.txt`);
      fs.writeFileSync(file, "probe");
      fs.rmSync(file);
      return `wrote and removed ${file}`;
    }),
    attempt("write into the plugin folder", () => {
      const file = path.join(pluginFolder, `spp-sandbox-probe-${process.pid}.txt`);
      fs.writeFileSync(file, "probe");
      fs.rmSync(file);
      return "wrote and removed a file next to plugins.json";
    }),
    attempt("start a program", () => {
      const result = spawnSync(process.platform === "win32" ? "cmd" : "sh", process.platform === "win32" ? ["/c", "echo", "hi"] : ["-c", "echo hi"], { encoding: "utf8" });
      if (result.error) throw result.error;
      return `exit ${result.status}`;
    }),
  ];
  // the network: Node's permission model does not limit it (the marketplace review checks "externalNetwork")
  try {
    const response = await fetch("https://api.zippopotam.us/us/10001", { signal: AbortSignal.timeout(5000) });
    checks.push({ check: "call an outside server", ok: true, detail: `HTTP ${response.status}` });
  } catch (error) {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    checks.push({ check: "call an outside server", ok: false, detail: `${String((error as Error).message)}: ${cause?.code || cause?.message || "no cause"}`.slice(0, 160) });
  }
  // the store's API through the context: works in both, run by the webstore for a sandboxed package
  try {
    const answer = await context.znode(`v2/portals/${encodeURIComponent(context.store.code)}/application/2`);
    checks.push({ check: "context.znode() (the store's API, its keys)", ok: answer.status === 200, detail: `HTTP ${answer.status}` });
  } catch (error) {
    checks.push({ check: "context.znode() (the store's API, its keys)", ok: false, detail: String((error as Error).message).slice(0, 120) });
  }
  if (request.query.heap) {
    const hoard: unknown[] = [];
    for (let index = 0; index < 4000; index++) hoard.push(new Array(1024 * 1024).fill(index));
    checks.push({ check: "allocate 4000 x 8 MB", ok: true, detail: `${hoard.length} arrays` });
  }
  return { package: "spp-sandbox-probe", store: context.store.code, checks };
}

const plugin: IRuntimePlugin = {
  name: "spp-sandbox-probe",
  apiVersion: 1,
  hooks: {},
  routes: { probe },
};

export default plugin;
