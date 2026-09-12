"use client";

import { CURRENCIES, type Currency } from "@/lib/currency";
import { useKolo } from "../kolo-provider";

/** Dollars first: it is what the balance actually is, naira is the view onto it. */
const ORDER: Currency[] = ["USD", "NGN"];

/**
 * Flip the balance between dollars and naira, in one tap, where the balance is.
 *
 * Settings still holds the full choice with its labels; this is the shortcut,
 * because switching is something people do while looking at a number rather
 * than something they go and configure.
 *
 * Deliberately not accent-coloured. Home spends its one accent on Send, and
 * this is a way of looking at the money rather than the thing to do next.
 */
export function CurrencySwitch() {
  const { currency, setCurrency } = useKolo();

  return (
    <div
      role="group"
      aria-label="Show balances in"
      className="inline-flex items-center rounded-pill border border-line bg-raised p-0.5"
    >
      {ORDER.map((option) => {
        const selected = option === currency;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setCurrency(option)}
            aria-pressed={selected}
            aria-label={CURRENCIES[option].label}
            className={`flex h-8 w-9 items-center justify-center rounded-pill text-[15px] font-semibold
                        transition active:scale-95
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                        ${selected ? "bg-line text-text" : "text-muted"}`}
          >
            {CURRENCIES[option].symbol}
          </button>
        );
      })}
    </div>
  );
}
