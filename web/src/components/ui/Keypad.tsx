"use client";

import { Backspace } from "./Icons";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

/**
 * Applies one keypress to an in-progress amount string.
 *
 * `decimals` is how many places the displayed currency takes -- 2 for dollars,
 * 0 for naira, which has no usable subunit. At 0 the decimal point is refused
 * outright, so a naira entry can only ever be whole.
 */
export function applyKey(current: string, key: string, decimals = 2): string {
  if (key === "back") return current.slice(0, -1);

  if (key === ".") {
    if (decimals === 0 || current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }

  // Digits: cap at the currency's precision, and never build "007".
  const [, fraction] = current.split(".");
  if (fraction !== undefined && fraction.length >= decimals) return current;
  if (current === "0") return key;
  if (current.replace(".", "").length >= 12) return current;

  return current + key;
}

export function Keypad({
  value,
  onChange,
  decimals = 2,
}: {
  value: string;
  onChange: (next: string) => void;
  decimals?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {KEYS.map((key) => {
        // Keep the 3-column grid intact when the currency has no decimal point:
        // an empty cell leaves 0 and backspace exactly where the thumb expects.
        if (key === "." && decimals === 0) return <span key={key} aria-hidden />;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(applyKey(value, key, decimals))}
            aria-label={key === "back" ? "Delete" : key}
            className="flex h-16 items-center justify-center rounded-2xl text-[26px] font-medium
                       text-text transition active:scale-95 active:bg-raised
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {key === "back" ? <Backspace className="h-6 w-6 text-muted" /> : key}
          </button>
        );
      })}
    </div>
  );
}
