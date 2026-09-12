"use client";

import { dueLabel, isDueSoon, secondsUntilDue, type CircleSummary } from "@/hooks/useCircles";
import { formatMoney } from "@/lib/format";
import { useKolo } from "./kolo-provider";
import { Warning } from "./ui/Icons";

/**
 * The nudge on opening the app when a contribution is close.
 *
 * There is no push in this phase, so this is the only thing standing between a
 * member and a missed round -- it appears on open, and it says the amount and
 * the deadline rather than a vague reminder, because that is what makes it
 * actionable without opening anything else.
 */
export function DueBanner({
  circles,
  onOpen,
}: {
  circles: CircleSummary[];
  onOpen: (circle: CircleSummary) => void;
}) {
  const { currency } = useKolo();

  // Behind comes first -- money has already been drawn -- then whatever is
  // closest to its deadline.
  const needing = circles
    .filter((circle) => circle.toCure > 0n || isDueSoon(circle))
    .sort((a, b) => {
      if ((a.toCure > 0n) !== (b.toCure > 0n)) return a.toCure > 0n ? -1 : 1;
      return secondsUntilDue(a) - secondsUntilDue(b);
    });

  const circle = needing[0];
  if (!circle) return null;

  const behind = circle.toCure > 0n;
  const seconds = secondsUntilDue(circle);

  return (
    <button
      type="button"
      onClick={() => onOpen(circle)}
      className={`mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left
                  transition active:scale-[0.99]
                  ${behind ? "border-danger/40 bg-danger/10" : "border-accent/40 bg-accent/5"}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                    ${behind ? "bg-danger/20 text-danger" : "bg-accent text-ink"}`}
      >
        <Warning className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-text">
          {behind
            ? `${circle.name}: you're behind`
            : `${circle.name}: ${formatMoney(circle.contribution, currency)} due ${dueLabel(seconds)}`}
        </span>
        <span className="block truncate text-[13px] text-muted">
          {behind
            ? `Put back ${formatMoney(circle.toCure, currency)} to rejoin the rotation`
            : `Round ${circle.round + 1} of ${circle.size}`}
        </span>
      </span>
    </button>
  );
}
