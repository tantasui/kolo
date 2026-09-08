"use client";

import { useState } from "react";
import type { Currency } from "@/lib/currency";
import { formatApprox, formatMoney } from "@/lib/format";
import { Button } from "../ui/Button";
import { Check, Copy, Share, WhatsApp } from "../ui/Icons";

/**
 * What the sender sees once the money is parked: the link, and the quickest
 * ways to hand it over.
 *
 * Anyone holding the link can claim it, so the copy says so plainly rather
 * than implying the money is reserved for a particular person.
 */
export function ShareLink({
  url,
  amount,
  currency,
  onDone,
}: {
  url: string;
  amount: bigint;
  currency: Currency;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

  const message = `I sent you ${formatMoney(amount, currency)} on Kolo. Tap to claim it: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[kolo] copy failed", error);
      setShareFailed(true);
    }
  }

  /**
   * The OS share sheet where it exists, falling back to the clipboard.
   * A cancelled sheet throws AbortError, which is not a failure.
   */
  async function share() {
    if (typeof navigator.share !== "function") {
      await copy();
      return;
    }

    try {
      await navigator.share({ title: "Kolo", text: message });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error("[kolo] share failed", error);
      await copy();
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-accent">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
            <path
              d="m5 13 4.5 4.5L19 7"
              stroke="#0A0A0C"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="48"
              className="animate-draw-check"
            />
          </svg>
        </span>

        <p className="tabular mt-7 text-[34px] font-bold tracking-tight">
          {formatMoney(amount, currency)}
        </p>
        {formatApprox(amount, currency) && (
          <p className="tabular mt-1 text-[15px] text-muted">{formatApprox(amount, currency)}</p>
        )}
        <p className="mt-1.5 text-[17px] text-muted">is waiting on a link</p>

        <p className="mt-8 w-full break-all rounded-2xl border border-line bg-surface px-4 py-3.5 text-left text-[13px] leading-relaxed text-muted">
          {url}
        </p>

        <p className="mt-3 max-w-[18rem] text-[13px] leading-relaxed text-muted">
          Anyone with this link can claim it, so send it to one person only.
        </p>

        {shareFailed && (
          <p className="mt-3 text-[13px] text-danger">
            Couldn&apos;t copy it — select the link above instead
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={share}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-pill bg-accent
                       text-[17px] font-semibold text-ink transition active:scale-[0.98]"
          >
            <Share className="h-5 w-5" />
            Share
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on WhatsApp"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border
                       border-line bg-raised text-text transition active:scale-95"
          >
            <WhatsApp className="h-6 w-6" />
          </a>

          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Link copied" : "Copy link"}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border
                       border-line bg-raised text-text transition active:scale-95"
          >
            {copied ? <Check className="h-6 w-6 text-accent" /> : <Copy className="h-6 w-6" />}
          </button>
        </div>

        <Button full variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    </>
  );
}
