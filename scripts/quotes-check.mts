// Checks quotesFor (src/commerce/quotes.ts, row 167): a signed-in buyer sees only the quote requests sent with the email
// they sign in with. Node runs the TypeScript directly (type stripping):
//   npm run quotes-check
import { quotesFor, type IQuoteRequest } from "../src/commerce/quotes.ts";

const quote = (reference: string, email: string) => ({ reference, email }) as IQuoteRequest;
const list = [quote("Q-1", "ana@buyer.example"), quote("Q-2", "ben@other.example"), quote("Q-3", "Ana@Buyer.Example")];
const cases: [string, string[]][] = [
  ["ana@buyer.example", ["Q-1", "Q-3"]], // their own, any case
  ["  ANA@buyer.example ", ["Q-1", "Q-3"]],
  ["ben@other.example", ["Q-2"]],
  ["carl@buyer.example", []], // someone with none
  ["", []], // no name: nothing, not everything
  ["buyer.example", []], // part of an address matches nothing
];
let failed = 0;
for (const [userName, expected] of cases) {
  const got = quotesFor(list, userName).map((item) => item.reference);
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} quotesFor(${JSON.stringify(userName)}) = ${JSON.stringify(got)}`);
}
console.log(failed ? `${failed} failed` : `all ${cases.length} passed`);
process.exit(failed ? 1 : 0);
