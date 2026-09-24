"use client";

import { useState } from "react";
import { config } from "@/config";
import { CURRENCIES } from "@/lib/currency";
import { formatEntry, formatMoney, parseAmount } from "@/lib/format";
import { targetDateFromInput, todayInputValue } from "@/lib/goals";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Keypad } from "../ui/Keypad";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";

type Step = "details" | "target" | "creating" | "failed";

const SUGGESTIONS = ["New laptop", "Rent", "School fees", "Emergency fund", "Holiday"];

/**
 * Setting a goal: what it is for, when by, and how much.
 *
 * Nothing moves here -- a goal is a name and a number until its owner adds to
 * it -- so there is no review step and no amount to be careful about. The one
 * thing to be clear about is that it is a target to aim for, not a lock.
 */
export function CreateGoal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: bigint) => void;
}) {
  const { currency, createGoal } = useKolo();

  const [step, setStep] = useState<Step>("details");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [entry, setEntry] = useState("");

  const target = parseAmount(entry, currency) ?? 0n;
  const trimmed = label.trim();

  async function confirm() {
    setStep("creating");
    try {
      const id = await createGoal({
        label: trimmed,
        target,
        targetDate: targetDateFromInput(date),
      });
      onCreated(id);
    } catch (error) {
      console.error("[kolo] could not create the goal", error);
      setStep("failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col px-5 pb-8 pt-6">
        {step === "details" && (
          <>
            <SheetHeader title="New goal" onClose={onClose} />

            <div className="mt-8">
              <h2 className="text-[26px] font-bold leading-tight tracking-tight">
                What are you saving for?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                A target to aim for, withdraw anytime.
              </p>
            </div>

            <div className="mt-7 space-y-6 overflow-y-auto">
              <div>
                <input
                  value={label}
                  onChange={(event) => {
                    // The contract's cap is in bytes, so counting characters
                    // would let an accented or emoji label through and revert.
                    const next = event.target.value;
                    if (new TextEncoder().encode(next).length <= config.goals.maxLabelBytes) {
                      setLabel(next);
                    }
                  }}
                  autoFocus
                  placeholder="New laptop"
                  aria-label="What the goal is for"
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-[19px]
                             font-semibold text-text outline-none placeholder:font-normal
                             placeholder:text-muted/60 focus:border-muted"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setLabel(suggestion)}
                      aria-pressed={trimmed === suggestion}
                      className={`h-9 rounded-pill border px-3.5 text-[14px] transition active:scale-95
                                  ${
                                    trimmed === suggestion
                                      ? "border-accent bg-accent/10 text-text"
                                      : "border-line bg-raised text-muted"
                                  }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="goal-date" className="mb-2.5 block text-[14px] font-medium text-muted">
                  By when? <span className="font-normal">— optional</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="goal-date"
                    type="date"
                    value={date}
                    min={todayInputValue()}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-12 flex-1 rounded-2xl border border-line bg-surface px-4 text-[16px]
                               text-text outline-none [color-scheme:dark] focus:border-muted"
                  />
                  {date && (
                    <button
                      type="button"
                      onClick={() => setDate("")}
                      className="h-12 rounded-2xl px-3 text-[15px] font-medium text-muted transition active:scale-95"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  Just a reminder for you. Your money stays yours before and after it.
                </p>
              </div>
            </div>

            <div className="flex-1" />
            <Button full className="mt-6" disabled={trimmed === ""} onClick={() => setStep("target")}>
              Continue
            </Button>
          </>
        )}

        {step === "target" && (
          <>
            <SheetHeader title={trimmed} onBack={() => setStep("details")} onClose={onClose} />
            <div className="flex flex-1 flex-col items-center justify-center">
              <p className="text-[15px] text-muted">Your target</p>
              <p
                className={`tabular mt-2 text-[60px] font-bold leading-none tracking-tight ${
                  entry === "" ? "text-muted/40" : "text-text"
                }`}
              >
                {formatEntry(entry, currency)}
              </p>
              <p className="mt-3 max-w-[18rem] text-center text-[14px] leading-relaxed text-muted">
                Nothing leaves your balance until you add to it.
              </p>
            </div>
            <Keypad value={entry} onChange={setEntry} decimals={CURRENCIES[currency].decimals} />
            <Button full className="mt-4" disabled={target === 0n} onClick={confirm}>
              {target === 0n ? "Set a target" : `Create goal — ${formatMoney(target, currency)}`}
            </Button>
          </>
        )}

        {step === "creating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <Spinner className="h-10 w-10 text-accent" />
            <p className="text-[18px] font-medium text-muted">Setting up your goal…</p>
          </div>
        )}

        {step === "failed" && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[19px] font-semibold">Something went wrong — try again</p>
              <p className="text-[15px] text-muted">Your money hasn&apos;t moved.</p>
            </div>
            <div className="space-y-3">
              <Button full onClick={confirm}>
                Try again
              </Button>
              <Button full variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
