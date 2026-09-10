"use client";

import { useState } from "react";
import { dueLabel, secondsUntilDue, type CircleSummary } from "@/hooks/useCircles";
import { formatApprox, formatMoney } from "@/lib/format";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Check, Warning } from "../ui/Icons";
import { SheetHeader } from "../ui/SheetHeader";

/**
 * One circle, and the one thing this member can do about it right now.
 *
 * A member is either square and owes this round's contribution, or Behind and
 * owes their deposit back. Both are one tap, and neither is a penalty screen:
 * being Behind means the deposit already covered the round, so the wording is
 * about getting back in the rotation rather than about having failed.
 */
export function CircleSheet({ circle, onClose }: { circle: CircleSummary; onClose: () => void }) {
  const { currency, contributeToCircle, cureCircle } = useKolo();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const behind = circle.toCure > 0n;
  const seconds = secondsUntilDue(circle);
  const amount = behind ? circle.toCure : circle.contribution;

  async function act() {
    setBusy(true);
    setError(null);
    try {
      await (behind ? cureCircle(circle) : contributeToCircle(circle));
      onClose();
    } catch (cause) {
      console.error("[kolo] circle action failed", cause);
      const reason = String(cause);
      setError(
        reason.includes("AlreadyContributed")
          ? "You've already put in for this round"
          : "Something went wrong — try again"
      );
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-y-auto px-5 pb-8 pt-6">
        <SheetHeader title={circle.name || "Circle"} onClose={onClose} />

        <section className="mt-8 rounded-2xl border border-line bg-surface px-4 py-4">
          <Fact label="Round" value={`${circle.round + 1} of ${circle.size}`} />
          <Fact
            label="Your contribution"
            value={formatMoney(circle.contribution, currency)}
            note={formatApprox(circle.contribution, currency)}
          />
          <Fact
            label="Due"
            value={circle.status === "running" ? dueLabel(seconds) : "—"}
            tone={seconds <= 0 && !circle.contributed ? "text-danger" : undefined}
            last
          />
        </section>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {behind ? (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15">
                <Warning className="h-8 w-8 text-danger" />
              </span>
              <p className="mt-6 text-[20px] font-semibold">Your deposit covered you</p>
              <p className="mt-2 max-w-[19rem] text-[15px] leading-relaxed text-muted">
                The round was paid out of your deposit, so nobody in the circle was short. Put back{" "}
                {formatMoney(circle.toCure, currency)} to rejoin the rotation and take your turn.
              </p>
            </>
          ) : circle.contributed ? (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                <Check className="h-8 w-8 text-ink" />
              </span>
              <p className="mt-6 text-[20px] font-semibold">You&apos;re in for this round</p>
              <p className="mt-2 max-w-[19rem] text-[15px] leading-relaxed text-muted">
                Nothing to do until the next one opens.
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] text-muted">This round</p>
              <p className="tabular mt-2 text-[52px] font-bold leading-none tracking-tight">
                {formatMoney(circle.contribution, currency)}
              </p>
              {formatApprox(circle.contribution, currency) && (
                <p className="tabular mt-2 text-[15px] text-muted">
                  {formatApprox(circle.contribution, currency)}
                </p>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="mb-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
            <Warning className="h-5 w-5 shrink-0" />
            {error}
          </p>
        )}

        {circle.status === "running" && (behind || !circle.contributed) && (
          <Button full loading={busy} onClick={act}>
            {behind
              ? `Put back ${formatMoney(amount, currency)}`
              : `Pay in ${formatMoney(amount, currency)}`}
          </Button>
        )}
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  note,
  tone,
  last = false,
}: {
  label: string;
  value: string;
  note?: string | null;
  tone?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between py-2.5 ${last ? "" : "border-b border-line"}`}>
      <span className="text-[15px] text-muted">{label}</span>
      <span className="text-right">
        <span className={`block text-[15px] font-semibold ${tone ?? "text-text"}`}>{value}</span>
        {note && <span className="block text-[13px] text-muted">{note}</span>}
      </span>
    </div>
  );
}
