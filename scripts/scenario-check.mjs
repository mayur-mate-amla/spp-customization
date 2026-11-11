// Is the work committed and pushed (row 181)? Checks every row of SCENARIOS.md marked Done:
//   - its notes link points at an existing docs/scenarios/<nnn>-<slug>/ folder with a README.md
//   - the README has a "How it renders" section, and every image it shows exists
//   - docs/RENDER-FLOW.md §10 has a row for it, naming a commit that exists and is on origin (pushed)
// and the repository: nothing uncommitted, nothing unpushed.
//   npm run scenario-check            exit code 1 when something is missing
//   npm run scenario-check -- --fix-links   rewrites notes links to docs/scenarios/<folder>/
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const problems = [];
const scenariosFile = "SCENARIOS.md";
let scenarios = fs.readFileSync(scenariosFile, "utf8");
const folders = fs.readdirSync("docs/scenarios");

// RENDER-FLOW §10: | <row> | <what> | <commit(s)> | ...
const flow = fs.readFileSync("docs/RENDER-FLOW.md", "utf8");
const table = flow.slice(flow.indexOf("## 10."));
const commitsFor = new Map();
for (const line of table.split("\n")) {
  const match = /^\| 0*(\d{1,3}) \|[^|]*\| ([^|]*) \|/.exec(line);
  if (match) commitsFor.set(Number(match[1]), [...(commitsFor.get(Number(match[1])) || []), ...(match[2].match(/\b[0-9a-f]{7,40}\b/g) || []), ...(/this commit/.test(match[2]) ? ["(this commit)"] : [])]);
}
const pushed = new Set(git("log", "--format=%h", "origin/main").split("\n").map((hash) => hash.slice(0, 7)));
const local = new Set(git("log", "--format=%h").split("\n").map((hash) => hash.slice(0, 7)));

let done = 0;
let fixed = 0;
for (const line of scenarios.split("\n")) {
  const match = /^\| (\d{1,3}) \|.*✅ Done \| (.*) \|$/.exec(line);
  if (!match) continue;
  done++;
  const row = Number(match[1]);
  const id = String(row).padStart(3, "0");
  const folder = folders.find((name) => name.startsWith(`${id}-`));
  if (!folder) {
    problems.push(`${id}: no docs/scenarios/${id}-* folder`);
    continue;
  }
  const link = /\[notes\]\(([^)]*)\)/.exec(match[2])?.[1] || "";
  const want = `docs/scenarios/${folder}/`;
  if (link !== want) {
    if (args().includes("--fix-links")) {
      scenarios = scenarios.replace(line, line.replace(/\[notes\]\([^)]*\)|\| *$/, (found) => (found.startsWith("[notes]") ? `[notes](${want})` : `| [notes](${want}) |`)));
      fixed++;
    } else problems.push(`${id}: notes link "${link || "(none)"}" should be "${want}"`);
  }
  const readme = path.join("docs/scenarios", folder, "README.md");
  if (!fs.existsSync(readme)) {
    problems.push(`${id}: no README.md in ${folder}`);
    continue;
  }
  const text = fs.readFileSync(readme, "utf8");
  if (!/^## How it renders/m.test(text)) problems.push(`${id}: README has no "How it renders" section`);
  for (const image of text.matchAll(/!\[[^\]]*\]\(([^)\s]+\.(?:png|jpg|gif|svg))\)/g)) {
    if (!fs.existsSync(path.join("docs/scenarios", folder, image[1]))) problems.push(`${id}: image ${image[1]} is missing`);
  }
  const commits = commitsFor.get(row) || [];
  if (!commits.length) problems.push(`${id}: no row in docs/RENDER-FLOW.md §10`);
  for (const commit of commits) {
    if (commit === "(this commit)") continue;
    const short = commit.slice(0, 7);
    if (!local.has(short)) problems.push(`${id}: commit ${commit} (RENDER-FLOW) is not in this repository`);
    else if (!pushed.has(short)) problems.push(`${id}: commit ${commit} is not pushed`);
  }
}
function args() {
  return process.argv.slice(2);
}
if (fixed) fs.writeFileSync(scenariosFile, scenarios);

const status = git("status", "--porcelain");
if (status) problems.push(`uncommitted changes:\n    ${status.split("\n").join("\n    ")}`);
const ahead = git("rev-list", "--count", "origin/main..HEAD");
if (ahead !== "0") problems.push(`${ahead} commit(s) not pushed`);
const pending = [...commitsFor].filter(([, commits]) => commits.includes("(this commit)")).map(([row]) => row);

console.log(`${done} rows done; ${local.size} commits, all on origin/main: ${ahead === "0" ? "yes" : "no"}${fixed ? `; ${fixed} notes links fixed` : ""}`);
if (pending.length) console.log(`rows whose commit is "(this commit)" in RENDER-FLOW (filled in by the next commit): ${pending.join(", ")}`);
for (const problem of problems) console.log(`  - ${problem}`);
console.log(problems.length ? `${problems.length} problem(s)` : "everything done is committed, documented and pushed");
process.exit(problems.length ? 1 : 0);
