"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getRate } from "@/config";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { useKolo } from "../kolo-provider";
import { Avatar } from "../ui/Avatar";
import { Check, Copy, SignOut } from "../ui/Icons";
import { SheetHeader } from "../ui/SheetHeader";

const ORDER: Currency[] = ["USD", "NGN"];

export function Settings({ onClose }: { onClose: () => void }) {
  const { logout } = usePrivy();
  const { handle, currency, setCurrency } = useKolo();

  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!handle) return;
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("[kolo] copy failed", error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-y-auto px-5 pb-8 pt-6">
        <SheetHeader title="Settings" onClose={onClose} />

        <section className="mt-8 flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-4">
          <Avatar handle={handle ?? "?"} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">Your handle</p>
            <p className="truncate text-[19px] font-semibold">@{handle}</p>
          </div>
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy your handle, @${handle ?? ""}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-muted transition active:scale-95"
          >
            {copied ? <Check className="h-5 w-5 text-accent" /> : <Copy className="h-5 w-5" />}
          </button>
        </section>

        <h2 className="mb-2 mt-8 px-2 text-[14px] font-medium text-muted">Show my money in</h2>

        <div className="space-y-2">
          {ORDER.map((option) => (
            <CurrencyRow
              key={option}
              option={option}
              selected={option === currency}
              onSelect={() => setCurrency(option)}
            />
          ))}
        </div>

        <p className="mt-3 px-2 text-[13px] leading-relaxed text-muted">
          Naira is worked out at a fixed demo rate of ₦{getRate().toLocaleString()} to $1. Your
          balance itself does not change.
        </p>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-10 flex h-14 w-full items-center justify-center gap-2 rounded-pill
                     border border-line bg-raised text-[17px] font-semibold text-danger
                     transition active:scale-[0.98]"
        >
          <SignOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function CurrencyRow({
  option,
  selected,
  onSelect,
}: {
  option: Currency;
  selected: boolean;
  onSelect: () => void;
}) {
  const { symbol, label, blurb } = CURRENCIES[option];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left
                  transition active:scale-[0.99]
                  ${selected ? "border-accent bg-accent/5" : "border-line bg-surface"}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[20px] font-bold
                    ${selected ? "bg-accent text-ink" : "bg-raised text-muted"}`}
      >
        {symbol}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-text">{label}</span>
        <span className="block truncate text-[14px] text-muted">{blurb}</span>
      </span>

      {selected && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
          <Check className="h-4 w-4 text-ink" />
        </span>
      )}
    </button>
  );
}
