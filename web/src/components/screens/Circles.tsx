"use client";

import { useState } from "react";
import { dueLabel, secondsUntilDue, type CircleSummary } from "@/hooks/useCircles";
import { formatMoney } from "@/lib/format";
import { CircleDetail } from "../circles/CircleDetail";
import { CreateCircle } from "../circles/CreateCircle";
import { useKolo } from "../kolo-provider";
import { Plus } from "../ui/Icons";

/**
 * Every circle this account is in.
 *
 * A circle is a standing commitment rather than a one-off, so the list leads
 * with what it wants from you -- whether your round is in, and when the next
 * one closes -- before anything about how it is doing.
 */
export function Circles() {
  const { circles, currency } = useKolo();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<CircleSummary | null>(null);

  return (
    <>
      <div className="flex min-h-[100dvh] flex-col px-5 pb-28 pt-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-bold tracking-tight">Circles</h1>
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="New circle"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line
                       bg-raised text-text transition active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {circles.length === 0 ? (
          <Empty onStart={() => setCreating(true)} />
        ) : (
          <ul className="mt-6 space-y-3">
            {circles.map((circle) => (
              <li key={circle.id.toString()}>
                <button
                  type="button"
                  onClick={() => setOpen(circle)}
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-left
                             transition active:scale-[0.99]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[17px] font-semibold text-text">
                      {circle.name || "Circle"}
                    </span>
                    <span className="tabular shrink-0 text-[17px] font-semibold text-text">
                      {formatMoney(circle.contribution, currency)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">{circle.size} people</p>
                  <div className="mt-3">
                    <Chip circle={circle} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && <CreateCircle onClose={() => setCreating(false)} />}
      {open && <CircleDetail circle={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** One line saying where a circle stands, and what it wants. */
function Chip({ circle }: { circle: CircleSummary }) {
  if (circle.status === "forming") {
    const left = circle.size - circle.joined;
    return (
      <Pill tone="waiting">
        {circle.joined} of {circle.size} joined — {left} more to start
      </Pill>
    );
  }

  if (circle.status === "running") {
    const due = secondsUntilDue(circle);
    if (circle.toCure > 0n) return <Pill tone="attention">Your deposit covered a round</Pill>;
    if (!circle.contributed) {
      return <Pill tone="attention">Your round is due {dueLabel(due)}</Pill>;
    }
    return (
      <Pill tone="calm">
        Round {circle.round + 1} of {circle.size} — you&apos;re in
      </Pill>
    );
  }

  if (circle.status === "complete") return <Pill tone="calm">Finished — everyone was paid</Pill>;
  return <Pill tone="waiting">Wound down</Pill>;
}

function Pill({
  tone,
  children,
}: {
  tone: "attention" | "calm" | "waiting";
  children: React.ReactNode;
}) {
  const tones = {
    attention: "bg-accent/10 text-accent",
    calm: "bg-raised text-muted",
    waiting: "bg-raised text-muted",
  };
  return (
    <span
      className={`inline-block rounded-pill px-3 py-1.5 text-[13px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-[22px] font-bold tracking-tight">Save together</p>
      <p className="mx-auto mt-2.5 max-w-[17rem] text-[15px] leading-relaxed text-muted">
        Everyone puts in the same amount each round, and each round one of you takes the whole
        pot. No coordinator. Nobody can run off with it.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-7 flex h-[54px] items-center justify-center gap-2 rounded-pill bg-accent px-7
                   text-[17px] font-semibold text-ink transition active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        Start a circle
      </button>
    </div>
  );
}
