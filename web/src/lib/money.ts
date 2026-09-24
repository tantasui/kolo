/**
 * The naira/dollar conversion, on its own and depending on nothing.
 *
 * It lives apart from `currency.ts` so a plain script can exercise the real
 * functions rather than a copy of them -- see `scripts/check-money.mjs`. The
 * rule these three enforce between them decides whether a number on screen is
 * actually spendable, so it is worth being able to check it.
 *
 * Amounts are always micro-units: 6 decimal places, in whichever currency.
 */

/** Micro-units in one whole unit of currency. */
export const MICRO = 1_000_000n;

/**
 * Dollars -> naira. Exact, because the rate is a whole number.
 */
export function toNairaUnits(usdUnits: bigint, rate: bigint): bigint {
  return usdUnits * rate;
}

/**
 * Naira -> dollars, **rounded up** to the next micro-dollar.
 *
 * A whole number of naira is almost never a whole number of micro-dollars, so
 * one direction has to give. Rounding up costs at most one micro-dollar and
 * buys both of the properties below; rounding down broke the first of them,
 * showing "₦4,999" on the screen after somebody typed ₦5,000.
 */
export function toUsdUnits(nairaUnits: bigint, rate: bigint): bigint {
  return (nairaUnits + rate - 1n) / rate;
}

/**
 * The whole naira a dollar balance is shown as: rounded **down**, so what is
 * on screen never claims more than is held. Mirrors `formatMoney` for naira.
 */
export function wholeNairaShown(usdUnits: bigint, rate: bigint): bigint {
  return toNairaUnits(usdUnits, rate) / MICRO;
}

/**
 * Both properties hold only while a naira is worth less than a dollar's worth
 * of micro-units -- true of any realistic rate, and asserted by the checker so
 * a future rate cannot quietly break the arithmetic.
 */
export const MAX_SUPPORTED_RATE = MICRO;
