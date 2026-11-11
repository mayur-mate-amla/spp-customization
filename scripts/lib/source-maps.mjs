// Source maps that lead back to this repo's TypeScript (row 183). The SDK compiles each .ts/.tsx to JavaScript in .build/
// without a source map (ts.transpileModule, znode-plugin/lib/znode-package.mjs transpileSources), then rollup bundles
// that JavaScript with one. So a bundle's map stops at the compiled file (../.build/slots/TrustStrip.js, a folder deleted
// after the build): browser devtools and stack traces show the compiled output, not src/slots/TrustStrip.tsx.
//
// chainSourceMaps() compiles each source again exactly as the SDK does, but with a source map, checks that the output is
// the same as what the bundle contains, and composes the two maps: bundle -> compiled file -> source. The new map names
// the sources "<package>/src/..." and carries their text (sourcesContent), so devtools shows the .tsx as written.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("package.json"));
const ts = require("typescript");
const { SourceMapConsumer, SourceMapGenerator } = require("source-map");
const AdmZip = require("adm-zip");

// the SDK's options (transpileSources), plus a source map
const COMPILE = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX, jsxImportSource: "react", sourceMap: true };
const stripMapComment = (code) => code.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, "");

/** One bundle map (JSON) → a map to the sources, or null when it cannot be done safely. */
export function chainMap(map, entryDir, packageName) {
  const bundle = new SourceMapConsumer(map);
  const generator = new SourceMapGenerator({ file: map.file });
  const steps = new Map();
  const report = { chained: 0, kept: 0, mismatched: [] };
  bundle.sources.forEach((source, index) => {
    const compiled = /(?:^|\/)\.build\/(.+)\.js$/.exec(source);
    if (!compiled) return;
    const base = path.join(entryDir, compiled[1]);
    const file = [".tsx", ".ts", ".jsx", ".js"].map((extension) => base + extension).find((candidate) => fs.existsSync(candidate));
    if (!file) return;
    const text = fs.readFileSync(file, "utf8");
    const { outputText, sourceMapText } = ts.transpileModule(text, { fileName: file, compilerOptions: COMPILE });
    // the bundle's copy of the compiled file must be what we compiled, or the composed map would point at wrong lines
    const inBundle = map.sourcesContent?.[index];
    if (inBundle != null && stripMapComment(outputText).trim() !== inBundle.trim()) {
      report.mismatched.push(source);
      return;
    }
    const name = `${packageName}/${path.relative(path.resolve("."), file).split(path.sep).join("/")}`;
    steps.set(source, { consumer: new SourceMapConsumer(JSON.parse(sourceMapText)), name, text });
  });
  bundle.eachMapping((mapping) => {
    if (mapping.source == null || mapping.originalLine == null) return;
    const generated = { line: mapping.generatedLine, column: mapping.generatedColumn };
    const step = steps.get(mapping.source);
    if (!step) {
      generator.addMapping({ generated, original: { line: mapping.originalLine, column: mapping.originalColumn }, source: mapping.source, name: mapping.name || undefined });
      report.kept++;
      return;
    }
    const original = step.consumer.originalPositionFor({ line: mapping.originalLine, column: mapping.originalColumn });
    if (original.line == null) return;
    generator.addMapping({ generated, original: { line: original.line, column: original.column }, source: step.name, name: mapping.name || original.name || undefined });
    report.chained++;
  });
  for (const step of steps.values()) generator.setSourceContent(step.name, step.text);
  bundle.sources.forEach((source, index) => {
    if (!steps.has(source) && map.sourcesContent?.[index] != null) generator.setSourceContent(source, map.sourcesContent[index]);
  });
  return { map: generator.toJSON(), sources: [...steps.values()].map((step) => step.name), report };
}

/** After `znode deploy`: chain the maps of a package's bundles in dist/, in its release zip and in the plugin folder. */
export function chainSourceMaps(manifestFile, pluginFolder) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const distDir = manifestFile === "znode-package.json" ? "dist" : `dist-${manifest.name}`;
  const zipFile = path.join("releases", `${manifest.name}-${manifest.version}.zpkg.zip`);
  const results = [];
  const zip = fs.existsSync(zipFile) ? new AdmZip(zipFile) : null;
  for (const part of ["server", "browser"]) {
    const entry = manifest.build?.[part];
    if (!entry) continue;
    const mapName = `${manifest.name}-${manifest.version}.${part}.mjs.map`;
    const distMap = path.join(distDir, mapName);
    if (!fs.existsSync(distMap)) continue;
    const original = JSON.parse(fs.readFileSync(distMap, "utf8"));
    // already chained (no .build source left): nothing to do
    if (!original.sources.some((source) => /(?:^|\/)\.build\//.test(source))) continue;
    const { map, sources, report } = chainMap(original, path.dirname(entry), manifest.name);
    if (report.mismatched.length) {
      results.push(`${mapName}: left as built (compiled output differs for ${report.mismatched.join(", ")})`);
      continue;
    }
    const text = JSON.stringify(map);
    fs.writeFileSync(distMap, text);
    zip?.updateFile(mapName, Buffer.from(text));
    const installed = path.join(pluginFolder, mapName);
    if (fs.existsSync(installed)) fs.writeFileSync(installed, text);
    results.push(`${mapName}: ${sources.length} sources mapped to TypeScript (${report.chained} mappings)`);
  }
  zip?.writeZip(zipFile);
  return results;
}

/** Where a position in an installed bundle comes from: { source, line, column, text } or null (rows 182-183). */
export function sourceAt(pluginFolder, bundle, line, column) {
  const mapFile = path.join(pluginFolder, `${bundle}.map`);
  if (!fs.existsSync(mapFile)) return null;
  const consumer = new SourceMapConsumer(JSON.parse(fs.readFileSync(mapFile, "utf8")));
  const original = consumer.originalPositionFor({ line, column: column - 1 });
  if (original.line == null) return null;
  const content = consumer.sourceContentFor(original.source, true) || "";
  return { source: original.source, line: original.line, column: original.column + 1, text: (content.split(/\r?\n/)[original.line - 1] || "").trim() };
}

/** A stack line's bundle position ("…/<bundle>.mjs?v=…:98:19") → { bundle, line, column }, or null. */
export function bundlePosition(text) {
  const match = /([a-z0-9-]+-\d+\.\d+\.\d+\.(?:server|browser)\.mjs)(?:\?[^:)\s]*)?:(\d+):(\d+)/.exec(text || "");
  return match ? { bundle: match[1], line: Number(match[2]), column: Number(match[3]) } : null;
}
