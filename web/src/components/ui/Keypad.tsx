"use client";

import { Backspace } from "./Icons";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

/** Applies one keypress to an in-progress amount string. */
export function applyKey(current: string, key: string): string {
  if (key === "back") return current.slice(0, -1);

  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }

  // Digits: cap at cents, and never build "007".
  const [, fraction] = current.split(".");
  if (fraction !== undefined && fraction.length >= 2) return current;
  if (current === "0") return key;
  if (current.replace(".", "").length >= 12) return current;

  return current + key;
}

export function Keypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(applyKey(value, key))}
          aria-label={key === "back" ? "Delete" : key}
          className="flex h-16 items-center justify-center rounded-2xl text-[26px] font-medium
                     text-text transition active:scale-95 active:bg-raised
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {key === "back" ? <Backspace className="h-6 w-6 text-muted" /> : key}
        </button>
      ))}
    </div>
  );
}
