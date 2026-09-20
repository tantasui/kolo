"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { dateLabel, progressLine, progressPercent, type Goal } from "@/lib/goals";
import { CreateGoal } from "../goals/CreateGoal";
import { GoalDetail } from "../goals/GoalDetail";
import { ProgressBar } from "../goals/ProgressBar";
import { useKolo } from "../kolo-provider";
import { Check, Plus } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";

/**
 * Money set aside, per thing it is set aside for.
 *
 * The value here is separation, not a guarantee: a goal takes money out of the
 * spending balance so it is not spent by accident, and gives it back whenever
 * its owner asks. There is nobody to guarantee anything against, so the copy
 * never implies the money is locked away.
 */
export function Goals() {
  const { goals, goalsLoaded, currency } = useKolo();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<bigint | null>(null);

  // Held by id so the sheet shows fresh figures as the list refreshes.
  const open = openId === null ? null : (goals.find((goal) => goal.id === openId) ?? null);
  const setAside = goals.reduce((sum, goal) => sum + goal.saved, 0n);

  return (
    <>
      <div className="flex min-h-[100dvh] flex-col px-5 pb-28 pt-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-bold tracking-tight">Goals</h1>
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="New goal"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line
                       bg-raised text-text transition active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {!goalsLoaded ? (
          <p className="mt-10 flex items-center gap-3 text-[15px] text-muted">
            <Spinner className="h-5 w-5" /> Opening your goals…
          </p>
        ) : goals.length === 0 ? (
          <Empty onStart={() => setCreating(true)} />
        ) : (
          <>
            <p className="mt-1 text-[14px] text-muted">
              <span className="tabular font-semibold text-text">{formatMoney(setAside, currency)}</span>{" "}
              set aside — withdraw anytime
            </p>

            <ul className="mt-6 space-y-3">
              {goals.map((goal) => (
                <li key={goal.id.toString()}>
                  <GoalRow goal={goal} onOpen={() => setOpenId(goal.id)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {creating && (
        <CreateGoal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(id);
          }}
        />
      )}
      {open && <GoalDetail goal={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function GoalRow({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const { currency } = useKolo();
  const percent = progressPercent(goal.saved, goal.target);
  const when = dateLabel(goal.targetDate);

  return (
    <button
      type="button"
      onClick={onOpen}
      // The whole sentence, for anyone not reading the layout.
      aria-label={progressLine(goal, currency)}
      className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-left
                 transition active:scale-[0.99]"
    >
      {/* "₦120,000 / ₦200,000 toward New Laptop — 60%", laid out so the
          figures and the name can each be found at a glance. */}
      <p className="text-[15px] leading-snug text-muted">
        <span className="tabular font-semibold text-text">{formatMoney(goal.saved, currency)}</span>
        {" / "}
        <span className="tabular">{formatMoney(goal.target, currency)}</span>
        {" toward "}
        <span className="font-semibold text-text">{goal.label || "your goal"}</span>
        {" — "}
        <span className="tabular font-semibold text-text">{percent}%</span>
      </p>

      <ProgressBar percent={percent} reached={goal.reached} />

      <div className="mt-2.5 flex items-center gap-2 text-[13px] text-muted">
        {goal.reached && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-accent/10 px-2.5 py-1 font-medium text-accent">
            <Check className="h-3.5 w-3.5" /> Reached
          </span>
        )}
        {when && <span>{when}</span>}
      </div>
    </button>
  );
}

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-[22px] font-bold tracking-tight">Save toward something</p>
      <p className="mx-auto mt-2.5 max-w-[17rem] text-[15px] leading-relaxed text-muted">
        A target to aim for, withdraw anytime. Money in a goal sits apart from your balance, so it
        isn&apos;t spent by accident.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-7 flex h-[54px] items-center justify-center gap-2 rounded-pill bg-accent px-7
                   text-[17px] font-semibold text-ink transition active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        Start a goal
      </button>
    </div>
  );
}
