// The deploy tooling's own logic (scripts/lib/): release cleanup (row 173) and stack-line parsing (rows 182-185).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error: plain JavaScript modules, no types
import { keepPreviousBrowserFiles } from "../scripts/lib/store.mjs";
// @ts-expect-error: plain JavaScript modules, no types
import { bundlePosition, sameBuild } from "../scripts/lib/source-maps.mjs";

let dir = "";
const folder = (...files: string[]) => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-test-"));
  for (const file of files) fs.writeFileSync(path.join(dir, file), "x");
  return dir;
};
afterEach(() => dir && fs.rmSync(dir, { recursive: true, force: true }));

describe("keepPreviousBrowserFiles (row 173)", () => {
  it("removes browser files of versions older than the previous one (the bug row 190 found)", () => {
    folder(
      "spp-customization-1.0.1.browser.mjs",
      "spp-customization-1.0.1.css",
      "spp-customization-1.0.2.browser.mjs",
      "spp-customization-1.0.3.browser.mjs",
      "spp-customization-1.0.3.css",
      "spp-customization-1.0.3.server.mjs",
      "spp-commerce-1.0.0.css"
    );
    const { removed } = keepPreviousBrowserFiles("spp-customization", "1.0.3", "1.0.2", dir);
    expect(removed.sort()).toEqual(["spp-customization-1.0.1.browser.mjs", "spp-customization-1.0.1.css"]);
    expect(fs.readdirSync(dir).sort()).toEqual([
      "spp-commerce-1.0.0.css",
      "spp-customization-1.0.2.browser.mjs",
      "spp-customization-1.0.3.browser.mjs",
      "spp-customization-1.0.3.css",
      "spp-customization-1.0.3.server.mjs",
    ]);
  });
  it("matches versions exactly: no wildcard dots, no other package", () => {
    folder("spp-customization-1x0x1.css", "spp-customization-extra-1.0.1.css", "spp-customization-1.0.1-font-inter-1.woff2");
    expect(keepPreviousBrowserFiles("spp-customization", "1.0.3", "1.0.2", dir).removed).toEqual([]);
  });
});

describe("bundlePosition and sameBuild (rows 182-185)", () => {
  const line = "at fail (file:///D:/runtime-plugins-store/spp-sandbox-probe-1.0.0.server.mjs?v=1794380340814.8918:98:19)";

  it("reads the bundle, its build time and the position from a stack line", () => {
    expect(bundlePosition(line)).toEqual({ bundle: "spp-sandbox-probe-1.0.0.server.mjs", built: "1794380340814.8918", line: 98, column: 19 });
    expect(bundlePosition("at x (http://host/api/extensions/files/spp-promos-1.0.0.browser.mjs:12:3)")).toEqual({ bundle: "spp-promos-1.0.0.browser.mjs", built: "", line: 12, column: 3 });
    expect(bundlePosition("at Object.render (node:internal/x:1:1)")).toBeNull();
  });
  it("tells whether the installed bundle is the build that logged the line", () => {
    folder("spp-sandbox-probe-1.0.0.server.mjs");
    const built = String(fs.statSync(path.join(dir, "spp-sandbox-probe-1.0.0.server.mjs")).mtimeMs);
    expect(sameBuild(dir, { bundle: "spp-sandbox-probe-1.0.0.server.mjs", built })).toBe("same");
    expect(sameBuild(dir, { bundle: "spp-sandbox-probe-1.0.0.server.mjs", built: "1" })).toBe("rebuilt");
    expect(sameBuild(dir, { bundle: "spp-gone-1.0.0.server.mjs", built })).toBe("gone");
    expect(sameBuild(dir, { bundle: "spp-sandbox-probe-1.0.0.server.mjs", built: "" })).toBe("");
  });
});
