// Makes broken copies of this package's zip, to show what `znode install` refuses (scenarios 006, 007 and 017).
//   node scripts/bad-packages.mjs <good.zpkg.zip> <outDir>
// Each case changes one thing in the manifest or the files; install them into a scratch plugin folder, never a store's.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("node_modules/znode-plugin/package.json"));
const AdmZip = require("adm-zip");
const [source, outDir] = process.argv.slice(2);
if (!source || !outDir) throw new Error("usage: node scripts/bad-packages.mjs <good.zpkg.zip> <outDir>");
fs.mkdirSync(outDir, { recursive: true });

const cases = {
  "bad-version": (m) => void (m.version = "1.0"),
  "bad-name": (m) => void (m.name = "Spp Customization"),
  "bad-api-version": (m) => void (m.apiVersion = 99),
  "bad-kind": (m) => void (m.kind = "skin"),
  "missing-file": (m) => void (m.files.browser = "spp-customization-1.0.0.missing.mjs"),
  "file-type": (_m, zip) => zip.addFile("install.exe", Buffer.from("MZ")),
  "folder": (_m, zip) => zip.addFile("nested/evil.css", Buffer.from("body{}")),
  "too-big": (_m, zip) => zip.addFile("spp-customization-big.woff2", Buffer.alloc(11 * 1024 * 1024, 1)),
  // a file that another installed package (apex) owns: overwriting it is refused (scenario 007)
  "other-package-file": (_m, zip) => zip.addFile("apex-1.0.19.css", Buffer.from("body{background:red}")),
};

for (const [name, change] of Object.entries(cases)) {
  const zip = new AdmZip(source);
  const entry = zip.getEntry("znode-package.json");
  const manifest = JSON.parse(entry.getData().toString("utf8"));
  change(manifest, zip);
  zip.updateFile("znode-package.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  const file = path.join(outDir, `${name}.zpkg.zip`);
  zip.writeZip(file);
  console.log(file);
}
