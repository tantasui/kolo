import { config } from "@/config";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  fromDisplayUnits,
  toDisplayUnits,
  type Currency,
} from "./currency";

const DECIMALS = BigInt(10) ** BigInt(config.token.decimals);

/**
 * Render a raw token amount in the user's chosen currency:
 * 1234560000n -> "$1,234.56", or "₦1,993,814.40" in naira.
 * Users only ever see this form -- no raw units.
 */
export function formatMoney(
  amount: bigint,
  currency: Currency = DEFAULT_CURRENCY,
  opts: { sign?: "always" | "never" } = {}
): string {
  const converted = toDisplayUnits(amount, currency);
  const negative = converted < 0n;
  const abs = negative ? -converted : converted;

  const whole = abs / DECIMALS;
  const fraction = abs % DECIMALS;

  // Round to cents (half-up) rather than truncating.
  const centsScale = DECIMALS / 100n;
  let cents = fraction / centsScale;
  if (fraction % centsScale >= centsScale / 2n) cents += 1n;

  let dollars = whole;
  if (cents === 100n) {
    dollars += 1n;
    cents = 0n;
  }

  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const symbol = CURRENCIES[currency].symbol;
  const body = `${symbol}${grouped}.${cents.toString().padStart(2, "0")}`;

  if (opts.sign === "always") return `${negative ? "-" : "+"}${body}`;
  return negative ? `-${body}` : body;
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

/** Display form for an in-progress keypad entry: "25.4" -> "$25.4" / "₦25.4". */
export function formatEntry(entry: string, currency: Currency = DEFAULT_CURRENCY): string {
  const symbol = CURRENCIES[currency].symbol;
  if (entry === "") return `${symbol}0`;
  const [whole, fraction] = entry.split(".");
  const grouped = (whole || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return entry.includes(".") ? `${symbol}${grouped}.${fraction}` : `${symbol}${grouped}`;
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
