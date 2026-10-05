/**
 * Turning a spoken sentence into a payment the send sheet can show.
 *
 *   "send 5k to tolu for lunch"            -> @tolu, 5000, note "lunch"
 *   "pay ada two thousand naira"           -> @ada, 2000 NGN
 *   "transfer $10.50 to tolu underscore b" -> @tolu_b, 10.50 USD
 *
 * This deliberately decides nothing. It only fills in the review screen, which
 * the person always sees, and the payment still needs a "send" or a tap.
 * Speech recognition already hands back clean text, so a small grammar covers
 * the way people actually ask, with no model or server involved.
 *
 * It depends on nothing, so `scripts/check-voice.mjs` can exercise the real
 * functions rather than a copy of them.
 */

export type SpokenCurrency = "USD" | "NGN";

export interface VoiceCommand {
  /** A handle-shaped guess at who, not yet looked up. */
  handle: string | null;
  /** Decimal string in `currency`, e.g. "5000" or "10.5". */
  amount: string | null;
  /** The currency that was said, or null to read it as the one on screen. */
  currency: SpokenCurrency | null;
  note: string;
}

const VERBS = new Set(["send", "pay", "transfer", "give", "move"]);
const NOTE_MARKERS = new Set(["for", "saying", "note", "memo"]);
const FILLER = new Set([
  "to", "at", "money", "cash", "the", "my", "please", "now", "thanks", "abeg", "him", "her",
]);

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = { thousand: 1_000, k: 1_000, grand: 1_000, million: 1_000_000 };
const CURRENCY_WORDS: Record<string, SpokenCurrency> = {
  "₦": "NGN", naira: "NGN", ngn: "NGN",
  $: "USD", dollar: "USD", dollars: "USD", usd: "USD", bucks: "USD",
};

const DIGITS = /^(\d+(?:\.\d+)?)(k|m)?$/;

function isNumberWord(token: string): boolean {
  return token in ONES || token in TENS || token in SCALES || token === "hundred" || DIGITS.test(token);
}

/** Can `tokens[i]` belong to a spoken amount? */
function isAmountToken(tokens: string[], i: number): boolean {
  const token = tokens[i];
  if (isNumberWord(token) || token in CURRENCY_WORDS) return true;
  const next = tokens[i + 1];
  // "a thousand", "one point five", "two hundred and fifty"
  if (token === "a") return next === "hundred" || (next !== undefined && next in SCALES);
  if (token === "point" || token === "and") {
    return i > 0 && isNumberWord(tokens[i - 1]) && next !== undefined && isNumberWord(next);
  }
  return false;
}

/** "two hundred and fifty thousand" -> 250000; "one point five k" -> 1500. */
function wordsToNumber(tokens: string[]): number | null {
  let total = 0;
  let current = 0;
  let fraction = "";
  let inFraction = false;
  let sawNumber = false;

  for (const token of tokens) {
    const digits = DIGITS.exec(token);
    if (inFraction && (digits || token in ONES) && !(token in SCALES)) {
      fraction += digits ? digits[1].replace(".", "") : String(ONES[token]);
      continue;
    }
    if (digits) {
      const value = Number(digits[1]) * (digits[2] === "k" ? 1_000 : digits[2] === "m" ? 1_000_000 : 1);
      current += value;
      sawNumber = true;
    } else if (token in ONES) {
      current += ONES[token];
      sawNumber = true;
    } else if (token in TENS) {
      current += TENS[token];
      sawNumber = true;
    } else if (token === "hundred") {
      current = (current || 1) * 100;
      sawNumber = true;
    } else if (token in SCALES) {
      const whole = current + (fraction ? Number(`0.${fraction}`) : 0);
      total += (whole || 1) * SCALES[token];
      current = 0;
      fraction = "";
      inFraction = false;
      sawNumber = true;
    } else if (token === "point") {
      inFraction = true;
    }
  }

  if (!sawNumber) return null;
  return total + current + (fraction ? Number(`0.${fraction}`) : 0);
}

/** Lower-case, split symbols off, drop thousands separators and punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/\bn(?=\d)/g, "₦ ")
    .replace(/([₦$])/g, " $1 ")
    .replace(/(\d)\s+k\b/g, "$1k")
    .replace(/[^a-z0-9_.@₦$\s]/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Up to two decimal places, no trailing zeros: 10.5, 5000. */
function toDecimalString(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function parseCommand(text: string): VoiceCommand {
  let tokens = tokenize(text);

  // Everything before the verb is preamble: "hey kolo, can you send..."
  const verb = tokens.findIndex((token) => VERBS.has(token));
  if (verb >= 0) tokens = tokens.slice(verb + 1);

  // The amount is the first run of number-ish words.
  let amount: string | null = null;
  let currency: SpokenCurrency | null = null;
  const start = tokens.findIndex((_, i) => isAmountToken(tokens, i) && !(tokens[i] in CURRENCY_WORDS || tokens[i] === "and"));
  if (start >= 0) {
    // A currency said first ("$10", "₦ 5000") belongs to the run too.
    let from = start;
    if (from > 0 && tokens[from - 1] in CURRENCY_WORDS) from -= 1;
    let to = start;
    while (to < tokens.length && isAmountToken(tokens, to)) to += 1;

    const run = tokens.slice(from, to);
    const value = wordsToNumber(run);
    if (value !== null && value > 0) {
      amount = toDecimalString(value);
      const said = run.find((token) => token in CURRENCY_WORDS);
      currency = said ? CURRENCY_WORDS[said] : null;
    }
    tokens = [...tokens.slice(0, from), ...tokens.slice(to)];
  }

  // A note is whatever follows "for" / "saying", once the amount is out.
  let note = "";
  const marker = tokens.findIndex((token, i) => i > 0 && NOTE_MARKERS.has(token));
  if (marker >= 0) {
    note = tokens.slice(marker + 1).join(" ");
    tokens = tokens.slice(0, marker);
  }

  // Whoever is left is the recipient; "to" points at them when it is said.
  const lastTo = tokens.lastIndexOf("to");
  if (lastTo >= 0 && lastTo < tokens.length - 1) tokens = tokens.slice(lastTo + 1);
  const words = tokens
    .map((token) => token.replace(/^@+/, ""))
    .filter((token) => token && !FILLER.has(token));
  const handle = words
    .map((token) => (token === "underscore" ? "_" : token))
    .join("")
    .replace(/[^a-z0-9_]/g, "");

  // With no "send" and no amount, it was not a payment ("what's the weather").
  if (verb < 0 && amount === null) return { handle: null, amount: null, currency: null, note: "" };

  return { handle: handle || null, amount, currency, note };
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

/**
 * Snap a heard handle onto someone the person has paid or been paid by.
 * Speech loses underscores and mishears a letter; it rarely invents a new
 * person, so the people already in the feed are the best guess. Returns the
 * heard handle unchanged when nobody is close.
 */
export function matchHandle(heard: string, known: string[]): string {
  if (known.includes(heard)) return heard;

  const bare = (handle: string) => handle.replace(/_/g, "");
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of known) {
    const d = distance(bare(heard), bare(candidate));
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }

  const allowed = Math.max(1, Math.floor(bare(heard).length / 4));
  return best !== null && bestDistance <= allowed ? best : heard;
}

/** The answer to "Send ₦5,000 to @tolu?" */
export function parseAnswer(text: string): "yes" | "no" | "unclear" {
  const said = ` ${text.toLowerCase().replace(/[^a-z' ]/g, " ")} `;
  if (/ (no|nope|cancel|stop|wait|don't|dont) /.test(said)) return "no";
  if (/ (send|send it|yes|yeah|yep|yup|confirm|go|ok|okay|sure|do it) /.test(said)) return "yes";
  return "unclear";
}
