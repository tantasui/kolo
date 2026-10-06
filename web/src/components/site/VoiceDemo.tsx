"use client";

import { useState } from "react";
import { parseCommand } from "@/lib/voice";
import { fromDisplayUnits } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { Mic } from "./Icons";

/**
 * The voice feature, parsed live on the page by the app's own parser.
 *
 * `parseCommand` is the function the send sheet uses, imported rather than
 * reimplemented, so what this panel shows is literally what the app would fill
 * in. It depends on nothing -- no model, no network -- which is why it can run
 * here at all, and that fact is the point the section is making.
 */
const PROMPTS = [
  "Send 5000 naira to chidi for dinner",
  "Pay 25 dollars to kemi for groceries",
  "Send 10k to tolu",
];

export function VoiceDemo() {
  const [heard, setHeard] = useState(PROMPTS[0]);
  const parsed = parseCommand(heard);

  const amount =
    parsed.amount === null
      ? "—"
      : formatMoney(
          fromDisplayUnits(
            BigInt(Math.round(Number(parsed.amount) * 1_000_000)),
            parsed.currency ?? "USD",
          ),
          parsed.currency ?? "USD",
        );

  return (
    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-4 lg:col-span-7">
        <span className="flex w-fit items-center gap-2 rounded-full bg-deep-2 px-3 py-1 text-label-caps text-spring">
          <Mic className="h-3.5 w-3.5" />
          Parsed on your phone
        </span>
        <h2 className="font-display text-[32px] font-extrabold leading-[36px] tracking-[-0.025em] sm:text-display-lg">
          Just say it.
          <br />
          <span className="text-spring">We handle the rest.</span>
        </h2>
        <p className="max-w-lg text-body-lg text-deep-quiet">
          A small grammar reads who, how much and what for, straight out of the
          sentence. There is no model and no server, so nothing you say is sent
          anywhere or kept. It only fills in the review screen, which you always
          see.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setHeard(prompt)}
              aria-pressed={heard === prompt}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-label-md transition-all
                          active:scale-95 ${
                            heard === prompt
                              ? "bg-spring text-on-spring"
                              : "bg-deep-2 text-card hover:bg-deep-2/70"
                          }`}
            >
              <Mic className="h-4 w-4 shrink-0" />
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 text-body shadow-xl lg:col-span-5">
        <div className="flex items-center justify-between border-b border-wash-3 pb-3">
          <span className="text-label-caps uppercase text-body-soft">
            What it filled in
          </span>
          <span className="flex items-center gap-1" aria-hidden>
            {[0, 120, 240].map((d) => (
              <span
                key={d}
                className="h-3 w-1 origin-bottom animate-bar rounded-full bg-grass"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        </div>

        <dl key={heard} className="flex animate-fade-up flex-col gap-3">
          {[
            ["Who", parsed.handle ? `@${parsed.handle}` : "—"],
            ["How much", amount],
            ["What for", parsed.note || "—"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between rounded-xl bg-wash p-2.5"
            >
              <dt className="text-body-sm text-body-soft">{k}</dt>
              <dd className="tabular text-label-lg capitalize text-deep">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between rounded-xl bg-wash-2 p-2.5">
          <span className="text-label-caps uppercase text-body-soft">Fee</span>
          <span className="text-label-md text-grass">Nothing</span>
        </div>
        <span className="w-full rounded-xl bg-deep py-3 text-center font-display text-label-lg text-spring">
          You confirm, then it sends
        </span>
      </div>
    </div>
  );
}
