import type { Currency } from "./currency";
import { formatMoney, parseAmount } from "./format";

/**
 * A savings goal as the app sees it.
 *
 * `reached` is the contract's record that `saved` crossed `target` at some
 * point. It stays true after a withdrawal: reaching the goal happened, and
 * taking the money out afterwards does not undo that. So "reached" and "saved
 * at least the target" are different questions, and the screens ask both.
 */
export interface Goal {
  id: bigint;
  label: string;
  target: bigint;
  saved: bigint;
  /** Unix seconds; 0 when the owner set no date. A note to self, never enforced. */
  targetDate: number;
  reached: boolean;
  /** Unix seconds when `saved` first crossed `target`; 0 if it never has. */
  reachedAt: number;
}

/**
 * Whole percent saved, 0 to 100.
 *
 * Rounded to the nearest percent, because the units underneath are not the
 * numbers on screen: ₦120,000 of ₦200,000 is 59.9999…% once both are turned
 * into micro-dollars, and rounding down would print 59% beside two figures
 * that plainly say 60.
 *
 * But **100 is only ever shown when the target is met**. Anything short of it
 * stops at 99, so 99.6% never reads as done.
 */
export function progressPercent(saved: bigint, target: bigint): number {
  if (target <= 0n) return 0;
  if (saved >= target) return 100;
  const nearest = Number((saved * 200n + target) / (target * 2n));
  return Math.min(99, nearest);
}

/** "₦120,000 / ₦200,000 toward New Laptop — 60%" */
export function progressLine(goal: Goal, currency: Currency): string {
  const percent = progressPercent(goal.saved, goal.target);
  return (
    `${formatMoney(goal.saved, currency)} / ${formatMoney(goal.target, currency)} ` +
    `toward ${goal.label || "your goal"} — ${percent}%`
  );
}

/** What is still to save. Zero, never negative, once the target is met. */
export function remainingOf(goal: Goal): bigint {
  return goal.saved >= goal.target ? 0n : goal.target - goal.saved;
}

/**
 * Whether adding money has just carried a goal over its target.
 *
 * Compares the contract's own flag before and after rather than recomputing
 * from amounts, so the celebration fires exactly when the contract recorded
 * the moment -- once, and never again for a goal that was emptied and refilled.
 */
export function justReached(before: Goal | undefined, after: Goal | undefined): boolean {
  return !!after && after.reached && !(before?.reached ?? false);
}

/**
 * A date input's value ("2026-12-31") as the end of that day, local time.
 *
 * End of day because "by the 31st" includes the 31st. Empty or malformed input
 * means no date, which the contract stores as 0.
 */
export function targetDateFromInput(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return 0;
  const [, year, month, day] = match;
  const end = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
  const seconds = Math.floor(end.getTime() / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

/** Today as a date input value, for the picker's lower bound. */
export function todayInputValue(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "by 31 Dec 2026", or null for a goal with no date.
 *
 * Written out rather than left to `toLocaleDateString`, which formats by
 * locale: Node renders "Dec 31, 2026" while the browser renders "31 Dec 2026",
 * and the two disagreeing across a server render is a hydration error. One
 * spelling everywhere is also one fewer thing that shifts under a reader.
 */
export function dateLabel(seconds: number): string | null {
  if (!seconds) return null;
  const date = new Date(seconds * 1000);
  return `by ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** A one-tap amount, in whole units of `currency`, as raw units. */
export function quickAmountUnits(amount: number, currency: Currency): bigint {
  return parseAmount(String(amount), currency) ?? 0n;
}
