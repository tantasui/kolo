/**
 * Checks the sentences people actually say against what the send sheet should
 * fill in. The parser only ever fills in the review screen, but a misheard
 * amount or person is the one mistake voice must not make quietly, so the
 * shapes it understands are pinned here.
 *
 *   cd web && npm run check:voice
 *
 * Needs Node 22.6+ (it imports TypeScript directly).
 */
import { matchHandle, parseAnswer, parseCommand } from "../src/lib/voice.ts";

const commands = [
  // [said, handle, amount, currency, note]
  ["Send 5000 to tolu", "tolu", "5000", null, ""],
  ["send 5k to Tolu for lunch", "tolu", "5000", null, "lunch"],
  ["Send ₦5,000 to @tolu", "tolu", "5000", "NGN", ""],
  ["send N5,000 to tolu", "tolu", "5000", "NGN", ""],
  ["Pay ada two thousand naira", "ada", "2000", "NGN", ""],
  ["pay ada two hundred and fifty", "ada", "250", null, ""],
  ["send a thousand to ada", "ada", "1000", null, ""],
  ["Transfer $10.50 to tolu underscore b", "tolu_b", "10.5", "USD", ""],
  ["send 10 dollars to tolu", "tolu", "10", "USD", ""],
  ["Hey Kolo, can you send 2.5k to sos for fuel money", "sos", "2500", null, "fuel money"],
  ["send sos one point five million naira", "sos", "1500000", "NGN", ""],
  ["send to tolu 20 bucks please", "tolu", "20", "USD", ""],
  ["send twenty five thousand to chi", "chi", "25000", null, ""],
  ["send money to tolu", "tolu", null, null, ""],
  ["send 300", null, "300", null, ""],
  ["send 5 k to ada obi", "adaobi", "5000", null, ""],
  ["give mama 10000 saying happy birthday", "mama", "10000", null, "happy birthday"],
  ["what is the weather", null, null, null, ""],
  ["tolu 5k", "tolu", "5000", null, ""],
];

const handles = [
  // [heard, known, expected]
  ["tolub", ["tolu_b", "ada"], "tolu_b"],
  ["adaobi", ["ada_obi", "tolu"], "ada_obi"],
  ["tollu", ["tolu", "ada"], "tolu"],
  ["tolu", ["tolu", "tolu_b"], "tolu"],
  ["chinedu", ["tolu", "ada"], "chinedu"],
  ["ada", ["sos"], "ada"],
];

const answers = [
  ["Send", "yes"],
  ["yes send it", "yes"],
  ["okay", "yes"],
  ["no", "no"],
  ["cancel", "no"],
  ["don't send", "no"],
  ["wait", "no"],
  ["hmm", "unclear"],
  ["", "unclear"],
];

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`  ✗ ${message}`);
};

for (const [said, handle, amount, currency, note] of commands) {
  const got = parseCommand(said);
  const want = { handle, amount, currency, note };
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fail(`"${said}"\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
  }
}
for (const [heard, known, expected] of handles) {
  const got = matchHandle(heard, known);
  if (got !== expected) fail(`matchHandle("${heard}", ${JSON.stringify(known)}) = ${got}, want ${expected}`);
}
for (const [said, expected] of answers) {
  const got = parseAnswer(said);
  if (got !== expected) fail(`parseAnswer("${said}") = ${got}, want ${expected}`);
}

const total = commands.length + handles.length + answers.length;
if (failures) {
  console.error(`\n${failures} of ${total} voice checks failed`);
  process.exit(1);
}
console.log(`✓ ${total} voice checks passed`);
