// Checks secretSetting (src/commerce/secrets.ts, row 159): inline secrets, env:NAME references, unset variables, and
// values that are not references. Node runs the TypeScript directly (type stripping):
//   npm run secrets-check
import { secretSetting } from "../src/commerce/secrets.ts";

const env = { SPP_STAFF_KEY: "k-123", EMPTY: "" };
const cases: [unknown, string][] = [
  ["abc", "abc"], // an inline secret, as before
  ["  abc ", "abc"],
  ["env:SPP_STAFF_KEY", "k-123"], // a reference: the variable's value
  ["env:MISSING", ""], // not set: "" (the routes refuse everything)
  ["env:EMPTY", ""],
  ["env:lower", "env:lower"], // not a reference (names are upper-case): taken as an inline secret
  ["env:A B", "env:A B"],
  [undefined, ""],
  [42, ""],
  ["", ""],
];
let failed = 0;
for (const [input, expected] of cases) {
  const got = secretSetting(input, env);
  if (got !== expected) failed++;
  console.log(`${got === expected ? "ok  " : "FAIL"} secretSetting(${JSON.stringify(input)}) = ${JSON.stringify(got)}`);
}
console.log(failed ? `${failed} failed` : `all ${cases.length} passed`);
process.exit(failed ? 1 : 0);
