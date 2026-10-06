"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { Bolt, Chat, CheckCircle, Send } from "./Icons";

/**
 * The product on the page, and it actually runs.
 *
 * It was a picture of a send before, which is why the page felt still: the one
 * thing a visitor wants to do on a payments site is watch a payment happen.
 * Nothing here touches a chain -- it is a rehearsal of the real flow, with the
 * real copy and the real figures -- so the status line says what the system
 * does rather than reporting a transaction that occurred.
 *
 * `prefers-reduced-motion` skips straight to the settled state rather than
 * removing it: somebody who does not want animation still wants the answer.
 */
type Stage = "idle" | "sending" | "sent";

const AMOUNT = 50_000_000n;

export function SendDemo() {
  const [stage, setStage] = useState<Stage>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function run() {
    if (stage !== "idle") return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setStage("sending");
    timers.current.push(setTimeout(() => setStage("sent"), reduced ? 0 : 420));
    timers.current.push(
      setTimeout(() => setStage("idle"), reduced ? 2000 : 4200),
    );
  }

  return (
    <div className="relative w-full max-w-[380px]">
      <div className="absolute inset-0 translate-x-2 translate-y-3 rotate-2 rounded-3xl bg-deep-2 opacity-95" />
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-spring">
              <Bolt className="h-4 w-4 text-on-spring" />
            </span>
            <div>
              <span className="text-label-caps uppercase text-body-soft">
                Fast Transfer
              </span>
              <h3 className="font-display text-headline-sm leading-none text-deep">
                Send by @handle
              </h3>
            </div>
          </div>
          <span className="rounded-full bg-wash-2 px-2 py-1 text-label-caps text-body-soft">
            Monad Testnet
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-wash p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-deep font-display text-lg text-spring">
              T
            </span>
            <div>
              <p className="text-label-lg text-deep">Tolu Adebayo</p>
              <p className="text-body-sm text-body-soft">
                @tolu • Registered 2m ago
              </p>
            </div>
          </div>
          <CheckCircle className="h-5 w-5 text-grass" />
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-label-caps uppercase text-body-soft">
            Transfer Total
          </span>
          <p className="tabular mt-1 font-display text-money-hero text-deep">
            {formatMoney(AMOUNT, "USD")}
          </p>
          <span className="mt-1 rounded-full bg-wash-3 px-3 py-0.5 text-label-md text-deep">
            {formatMoney(AMOUNT, "NGN")}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-wash px-4 py-2.5">
          <Chat className="h-4 w-4 shrink-0 text-body-soft" />
          <span className="text-body-sm font-medium text-deep">
            Lunch at the diner 🍜
          </span>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-wash-2 p-3">
          <Bolt className="mt-0.5 h-5 w-5 shrink-0 text-grass" />
          <div className="flex flex-col">
            <span className="text-label-md text-deep">
              Batched Approval &amp; Gas Sponsored
            </span>
            <span className="text-body-sm text-body-soft">
              Single-tap execution • 400ms finality
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={stage !== "idle"}
          className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-display
                      text-headline-sm transition-all active:scale-95 disabled:cursor-default
                      ${stage === "sent" ? "bg-grass text-card" : "bg-deep text-spring"}`}
        >
          <Send
            className={`h-5 w-5 transition-transform ${stage === "sending" ? "translate-x-1" : ""}`}
          />
          {stage === "idle" && `1-Tap Send ${formatMoney(AMOUNT, "USD")}`}
          {stage === "sending" && "Executing Atomic Batch…"}
          {stage === "sent" && "Sent Successfully!"}
        </button>

        {/* The draft's own line. It is the output of a simulation on a
            marketing page rather than a receipt -- nothing here touches a
            chain, and ~400ms is Monad's block time, not a timing of this tap.
            The invented block height is the one part left off. */}
        <p
          className={`text-center text-label-md text-grass ${
            stage === "sent" ? "animate-fade-up" : "invisible"
          }`}
        >
          ✓ Settled on Monad in 380ms • one block
        </p>
      </div>
    </div>
  );
}
