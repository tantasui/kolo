import { getRate } from "@/config";

/**
 * The currency the user sees. The balance is always dollars on chain -- this
 * is purely how it is rendered, chosen in Settings and remembered per person.
 */
export type Currency = "USD" | "NGN";

export const CURRENCIES: Record<Currency, { symbol: string; label: string; blurb: string }> = {
  USD: { symbol: "$", label: "Dollars", blurb: "Show balances in dollars" },
  NGN: { symbol: "₦", label: "Naira", blurb: "Converted at a fixed demo rate" },
};

export const DEFAULT_CURRENCY: Currency = "USD";

function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "NGN";
}

/**
 * Raw token units (6dp dollars) -> units of `currency`, still 6dp.
 *
 * The rate is a whole number, so dollars -> naira is exact and the reverse
 * truncates by at most one micro-unit. Converting a displayed balance back
 * therefore always lands on or just under the original, never above it --
 * which is the direction that matters, since the result is spendable.
 */
export function toDisplayUnits(usdUnits: bigint, currency: Currency): bigint {
  return currency === "NGN" ? usdUnits * BigInt(getRate()) : usdUnits;
}

/** Units of `currency` -> raw token units. Inverse of `toDisplayUnits`. */
export function fromDisplayUnits(displayUnits: bigint, currency: Currency): bigint {
  return currency === "NGN" ? displayUnits / BigInt(getRate()) : displayUnits;
}

/**
 * Remembered per Privy user id rather than per account address, so the choice
 * follows the person across devices' accounts and survives sign-out.
 */
const VERSION = 1;

function keyFor(userId: string): string {
  return `kolo:currency:v${VERSION}:${userId}`;
}

export function loadCurrency(userId: string): Currency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;

  try {
    const stored = window.localStorage.getItem(keyFor(userId));
    return isCurrency(stored) ? stored : DEFAULT_CURRENCY;
  } catch (error) {
    console.error("[kolo] could not read currency preference", error);
    return DEFAULT_CURRENCY;
  }
}

export function saveCurrency(userId: string, currency: Currency): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(keyFor(userId), currency);
  } catch (error) {
    console.error("[kolo] could not persist currency preference", error);
  }
}
