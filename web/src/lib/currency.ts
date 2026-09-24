import { getRate } from "@/config";
import { toNairaUnits, toUsdUnits } from "./money";

/**
 * The currency the user sees. The balance is always dollars on chain -- this
 * is purely how it is rendered, chosen in Settings and remembered per person.
 */
export type Currency = "USD" | "NGN";

export const CURRENCIES: Record<
  Currency,
  { symbol: string; label: string; blurb: string; decimals: 0 | 2 }
> = {
  /** Dollars are what the chain holds, so they are shown to the cent. */
  USD: { symbol: "$", label: "Dollars", blurb: "Show balances in dollars", decimals: 2 },
  /**
   * Naira is shown whole. Kobo are not used in practice, and at ~₦1,615 to the
   * dollar two decimal places are noise on every realistic amount.
   */
  NGN: { symbol: "₦", label: "Naira", blurb: "Converted at a fixed demo rate", decimals: 0 },
};

export const DEFAULT_CURRENCY: Currency = "USD";

function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "NGN";
}

/**
 * Raw token units (6dp dollars) -> units of `currency`, still 6dp.
 *
 * The rate is a whole number, so dollars -> naira is exact. Naira is then shown
 * rounded down (see formatMoney), so a displayed balance never overstates what
 * is held.
 */
export function toDisplayUnits(usdUnits: bigint, currency: Currency): bigint {
  return currency === "NGN" ? toNairaUnits(usdUnits, BigInt(getRate())) : usdUnits;
}

/**
 * Units of `currency` -> raw token units. Inverse of `toDisplayUnits`.
 *
 * **Naira rounds up**, to the next micro-dollar. A whole-naira amount is almost
 * never a whole number of micro-dollars, so one direction or the other has to
 * give -- and rounding down meant the amount somebody typed came back smaller
 * on the very next screen: ₦5,000 typed, "Send ₦4,999" shown.
 *
 * Rounding up fixes that and keeps the guarantee that matters. For a naira
 * amount N and rate r (r < 10^6):
 *
 *   shows as typed   u = ceil(N·10^6 / r) gives N·10^6 <= u·r < N·10^6 + r,
 *                    so floor(u·r / 10^6) = N exactly.
 *
 *   still spendable  a balance B shown as D = floor(B·r / 10^6) has
 *                    B·r >= D·10^6, so the integer B >= ceil(D·10^6 / r).
 *                    Typing back the balance on screen never asks for more
 *                    than is held.
 *
 * The cost is at most one micro-dollar more than N's exact value, and every
 * caller still checks the result against the real balance in units.
 *
 * The arithmetic itself is in `money.ts`, where `scripts/check-money.mjs` can
 * reach it: both properties above are checked there over millions of amounts,
 * so a change of direction fails rather than showing up on a phone.
 */
export function fromDisplayUnits(displayUnits: bigint, currency: Currency): bigint {
  if (currency !== "NGN") return displayUnits;
  return toUsdUnits(displayUnits, BigInt(getRate()));
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
