"use client";

import type { CircleInvite } from "@/hooks/useCircles";
import { formatApprox, formatMoney } from "@/lib/format";
import { useKolo } from "../kolo-provider";

/**
 * The three facts a person is owed before they post a deposit, in the order
 * they are owed them: **position, amount, refund**.
 *
 * It is one component rather than three lines copied onto each screen so the
 * order cannot drift: every screen that appears before a deposit renders this,
 * and there is no way to render it out of order or leave a part out.
 */
export function DepositTerms({ invite }: { invite: CircleInvite }) {
  const { currency } = useKolo();

  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-4">
      <Line
        label="Your position"
        value={`${invite.nextPosition + 1} of ${invite.size}`}
        note={
          invite.nextPosition === invite.size - 1
            ? "Last to be paid, so the smallest deposit"
            : `You take the pot in round ${invite.nextPosition + 1}`
        }
      />
      <Line
        label="Deposit today"
        value={formatMoney(invite.deposit, currency)}
        note={formatApprox(invite.deposit, currency)}
        emphasis
      />
      <Line
        label="Refund"
        value="In full when the circle completes"
        note="If you miss a round your deposit covers it — top it back up and it stays whole"
        last
      />
    </div>
  );
}

function Line({
  label,
  value,
  note,
  emphasis = false,
  last = false,
}: {
  label: string;
  value: string;
  note?: string | null;
  emphasis?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`py-3 ${last ? "" : "border-b border-line"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="shrink-0 text-[15px] text-muted">{label}</span>
        <span
          className={`tabular text-right font-semibold ${emphasis ? "text-[20px] text-text" : "text-[15px] text-text"}`}
        >
          {value}
        </span>
      </div>
      {note && <p className="mt-1 text-[13px] leading-relaxed text-muted">{note}</p>}
    </div>
  );
}
