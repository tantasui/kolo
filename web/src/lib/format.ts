import { config } from "@/config";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  fromDisplayUnits,
  toDisplayUnits,
  type Currency,
} from "./currency";

const DECIMALS = BigInt(10) ** BigInt(config.token.decimals);

const group = (value: bigint) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Render a raw token amount in the user's chosen currency:
 * 1234560000n -> "$1,234.56", or "₦1,993,814" in naira.
 * Users only ever see this form -- no raw units.
 *
 * Dollars round to the cent. Naira is shown whole and **rounded down**: it is
 * a view onto an underlying dollar balance, and flooring means the figure on
 * screen never overstates what is held, so the whole displayed balance is
 * always spendable. See the round-trip note in lib/currency.ts.
 */
export function formatMoney(
  amount: bigint,
  currency: Currency = DEFAULT_CURRENCY,
  opts: { sign?: "always" | "never" } = {}
): string {
  const converted = toDisplayUnits(amount, currency);
  const negative = converted < 0n;
  const abs = negative ? -converted : converted;
  const symbol = CURRENCIES[currency].symbol;

  const whole = abs / DECIMALS;
  const fraction = abs % DECIMALS;

  let body: string;

  if (CURRENCIES[currency].decimals === 0) {
    body = `${symbol}${group(whole)}`;
  } else {
    // Round to cents (half-up) rather than truncating.
    const centsScale = DECIMALS / 100n;
    let cents = fraction / centsScale;
    if (fraction % centsScale >= centsScale / 2n) cents += 1n;

    let dollars = whole;
    if (cents === 100n) {
      dollars += 1n;
      cents = 0n;
    }

    body = `${symbol}${group(dollars)}.${cents.toString().padStart(2, "0")}`;
  }

  if (opts.sign === "always") return `${negative ? "-" : "+"}${body}`;
  return negative ? `-${body}` : body;
}

/**
 * The same amount in the other currency, for the muted secondary line shown
 * under a naira figure. Naira is a converted view, so the dollars it stands
 * for are always kept visible next to it.
 */
export function formatApprox(amount: bigint, currency: Currency): string | null {
  return currency === "NGN" ? `≈ ${formatMoney(amount, "USD")}` : null;
}

/**
 * Convert a typed amount string ("25", "25.4", "25.40") to raw token units,
 * reading the input as `currency`. Returns null when it is not well-formed.
 *
 * The keypad shows whichever currency the user picked, so a naira entry is
 * divided back down to the dollars actually held on chain.
 */
export function parseAmount(input: string, currency: Currency = DEFAULT_CURRENCY): bigint | null {
  const trimmed = input.trim();
  if (!/^\d*(\.\d*)?$/.test(trimmed) || trimmed === "" || trimmed === ".") return null;

  const [whole = "0", fraction = ""] = trimmed.split(".");
  if (fraction.length > config.token.decimals) return null;

  const padded = fraction.padEnd(config.token.decimals, "0");
  const displayUnits = BigInt(whole || "0") * DECIMALS + BigInt(padded || "0");

  return fromDisplayUnits(displayUnits, currency);
}

/**
 * Display form for an in-progress keypad entry: "25.4" -> "$25.4".
 * Naira takes no decimals, so the keypad never produces a fractional entry.
 */
export function formatEntry(entry: string, currency: Currency = DEFAULT_CURRENCY): string {
  const symbol = CURRENCIES[currency].symbol;
  if (entry === "") return `${symbol}0`;
  const [whole, fraction] = entry.split(".");
  const grouped = group(BigInt(whole || "0"));
  return entry.includes(".") ? `${symbol}${grouped}.${fraction}` : `${symbol}${grouped}`;
}

/**
 * Raw units -> a keypad entry in `currency`: the inverse of `parseAmount`, for
 * filling the keypad from something other than fingers. Naira floors to whole
 * naira and dollars round to the cent, the same as `formatMoney` shows them.
 */
export function toEntry(amount: bigint, currency: Currency = DEFAULT_CURRENCY): string {
  const display = toDisplayUnits(amount, currency);
  if (CURRENCIES[currency].decimals === 0) return (display / DECIMALS).toString();

  const centsScale = DECIMALS / 100n;
  const cents = (display + centsScale / 2n) / centsScale;
  const whole = (cents / 100n).toString();
  const fraction = (cents % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

/**
 * An amount the way it should be read aloud: "5,000 naira", "10 dollars and
 * 50 cents". Symbols are read inconsistently by speech engines, words are not.
 */
export function spokenMoney(amount: bigint, currency: Currency = DEFAULT_CURRENCY): string {
  const shown = formatMoney(amount, currency).slice(CURRENCIES[currency].symbol.length);
  if (currency === "NGN") return `${shown} naira`;

  const [dollars, cents] = shown.split(".");
  const dollarWords = `${dollars} ${dollars === "1" ? "dollar" : "dollars"}`;
  if (!cents || cents === "00") return dollarWords;
  return `${dollarWords} and ${Number(cents)} ${cents === "01" ? "cent" : "cents"}`;
}

/** "2m ago", "Yesterday", "3 Sep" -- never a raw timestamp. */
export function formatWhen(unixSeconds: number | null): string {
  if (unixSeconds === null) return "Just now";

  const deltaSeconds = Math.floor(Date.now() / 1000) - unixSeconds;
  if (deltaSeconds < 45) return "Just now";
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  if (deltaSeconds < 172800) return "Yesterday";

  const date = new Date(unixSeconds * 1000);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Normalise user-typed handle input: strip a leading @, lowercase, trim. */
export function normaliseHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** Client-side mirror of KoloRegistry's on-chain validation. */
export function handleProblem(handle: string): string | null {
  if (handle.length === 0) return null;
  if (handle.length < config.handle.minLength) {
    return `At least ${config.handle.minLength} characters`;
  }
  if (handle.length > config.handle.maxLength) {
    return `At most ${config.handle.maxLength} characters`;
  }
  if (!config.handle.pattern.test(handle)) {
    return "Letters, numbers and _ only";
  }
  return null;
}

/** Two-letter monogram for an avatar circle. */
export function initials(handle: string): string {
  const letters = handle.replace(/[^a-z0-9]/g, "");
  return (letters.slice(0, 2) || "?").toUpperCase();
}
