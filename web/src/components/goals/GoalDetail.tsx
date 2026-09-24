"use client";

import { useState } from "react";
import { config } from "@/config";
import { CURRENCIES } from "@/lib/currency";
import { formatApprox, formatEntry, formatMoney, parseAmount } from "@/lib/format";
import {
  dateLabel,
  justReached,
  progressPercent,
  quickAmountUnits,
  remainingOf,
  type Goal,
} from "@/lib/goals";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Confetti } from "../ui/Confetti";
import { Check, Warning } from "../ui/Icons";
import { Keypad } from "../ui/Keypad";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";
import { ProgressBar } from "./ProgressBar";

type Mode = "view" | "add" | "withdraw" | "working" | "reached";

/**
 * One goal: how far along it is, and the two things its owner can do.
 *
 * Adding and withdrawing sit side by side on purpose. Withdrawing is not an
 * emergency exit hidden behind a confirmation -- it is half of what a goal is,
 * and it works for any amount at any time, before the target or after it.
 */
export function GoalDetail({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { currency, balance, contributeToGoal, withdrawFromGoal, refreshBalance } = useKolo();

  const [mode, setMode] = useState<Mode>("view");
  const [entry, setEntry] = useState("");
  /**
   * An exact amount chosen by a chip rather than typed.
   *
   * "Fill it" and "Withdraw all" must move the precise number of units, not
   * the figure on screen: naira is shown rounded down, so sending what is
   * displayed would leave a goal a fraction short of its target, or leave a
   * sliver behind after "all". The chip carries the real amount instead.
   */
  const [exact, setExact] = useState<bigint | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const percent = progressPercent(goal.saved, goal.target);
  const remaining = remainingOf(goal);
  const when = dateLabel(goal.targetDate);
  const available = balance ?? 0n;

  const amount = exact ?? parseAmount(entry, currency) ?? 0n;
  const limit = mode === "withdraw" ? goal.saved : available;
  const tooMuch = amount > limit;

  function open(next: "add" | "withdraw") {
    setEntry("");
    setExact(null);
    setError(null);
    setNotice(null);
    setMode(next);
  }

  function type(next: string) {
    setExact(null);
    setEntry(next);
  }

  function pick(units: bigint) {
    setEntry("");
    setExact(units);
  }

  async function submit(kind: "add" | "withdraw") {
    setMode("working");
    setError(null);
    try {
      if (kind === "add") {
        const after = await contributeToGoal(goal, amount);
        void refreshBalance();
        if (justReached(goal, after)) {
          setMode("reached");
          return;
        }
        setNotice(`${formatMoney(amount, currency)} set aside`);
      } else {
        await withdrawFromGoal(goal, amount);
        void refreshBalance();
        setNotice(`${formatMoney(amount, currency)} moved back to your balance`);
      }
      setMode("view");
    } catch (cause) {
      console.error(`[kolo] goal ${kind} failed`, cause);
      setError("Something went wrong — try again. Your money hasn't moved.");
      setMode(kind);
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col px-5 pb-8 pt-6">
        {mode === "view" && (
          <>
            <SheetHeader title={goal.label || "Goal"} onClose={onClose} />

            <section className="mt-8">
              <p className="text-[14px] font-medium text-muted">Saved</p>
              <p className="tabular mt-1 text-[48px] font-bold leading-none tracking-tight">
                {formatMoney(goal.saved, currency)}
              </p>
              {formatApprox(goal.saved, currency) && (
                <p className="tabular mt-1.5 text-[15px] text-muted">
                  {formatApprox(goal.saved, currency)}
                </p>
              )}

              <p className="mt-4 text-[15px] text-muted">
                of <span className="tabular font-semibold text-text">{formatMoney(goal.target, currency)}</span>
                {" — "}
                <span className="tabular font-semibold text-text">{percent}%</span>
              </p>
              <ProgressBar percent={percent} reached={goal.reached} />

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-muted">
                {goal.reached ? (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-accent/10 px-2.5 py-1 font-medium text-accent">
                    <Check className="h-3.5 w-3.5" /> Target reached
                  </span>
                ) : (
                  <span>
                    <span className="tabular font-semibold text-text">{formatMoney(remaining, currency)}</span> to go
                  </span>
                )}
                {when && <span>· {when}</span>}
              </div>
            </section>

            {notice && (
              <p className="mt-6 flex items-center gap-2 rounded-2xl bg-accent/10 px-4 py-3 text-[14px] text-text">
                <Check className="h-4 w-4 shrink-0 text-accent" />
                {notice}
              </p>
            )}

            <div className="flex-1" />

            <p className="mb-4 text-center text-[13px] leading-relaxed text-muted">
              Withdraw anytime — any amount, before or after the target.
            </p>
            <div className="space-y-3">
              <Button full onClick={() => open("add")}>
                Add money
              </Button>
              <Button
                full
                variant="secondary"
                disabled={goal.saved === 0n}
                onClick={() => open("withdraw")}
              >
                Withdraw
              </Button>
            </div>
          </>
        )}

        {(mode === "add" || mode === "withdraw") && (
          <AmountEntry
            mode={mode}
            goal={goal}
            entry={entry}
            exact={exact}
            amount={amount}
            limit={limit}
            tooMuch={tooMuch}
            remaining={remaining}
            error={error}
            onType={type}
            onPick={pick}
            onBack={() => setMode("view")}
            onClose={onClose}
            onSubmit={() => submit(mode)}
          />
        )}

        {mode === "working" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <Spinner className="h-10 w-10 text-accent" />
            <p className="text-[18px] font-medium text-muted">One moment…</p>
          </div>
        )}

        {mode === "reached" && <Reached goal={goal} amount={amount} onDone={() => setMode("view")} />}
      </div>
    </div>
  );
}

/* ---------- entering an amount ---------- */

function AmountEntry({
  mode,
  goal,
  entry,
  exact,
  amount,
  limit,
  tooMuch,
  remaining,
  error,
  onType,
  onPick,
  onBack,
  onClose,
  onSubmit,
}: {
  mode: "add" | "withdraw";
  goal: Goal;
  entry: string;
  exact: bigint | null;
  amount: bigint;
  limit: bigint;
  tooMuch: boolean;
  remaining: bigint;
  error: string | null;
  onType: (next: string) => void;
  onPick: (units: bigint) => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { currency } = useKolo();
  const adding = mode === "add";

  const shown = exact !== null ? formatMoney(exact, currency) : formatEntry(entry, currency);
  const empty = exact === null && entry === "";

  // Whole-currency shortcuts, plus the one amount that is specific to this
  // goal: exactly what is left to save, or exactly what is saved.
  const quick = config.goals.quickAmounts[currency].map((n) => ({
    label: formatMoney(quickAmountUnits(n, currency), currency),
    units: quickAmountUnits(n, currency),
  }));
  const special = adding
    ? remaining > 0n
      ? { label: `What's left — ${formatMoney(remaining, currency)}`, units: remaining }
      : null
    : { label: `All — ${formatMoney(goal.saved, currency)}`, units: goal.saved };

  return (
    <>
      <SheetHeader
        title={adding ? `Add to ${goal.label || "goal"}` : "Withdraw"}
        onBack={onBack}
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col items-center justify-center">
        <p
          className={`tabular text-[56px] font-bold leading-none tracking-tight transition-colors ${
            empty ? "text-muted/40" : tooMuch ? "text-danger" : "text-text"
          }`}
        >
          {shown}
        </p>
        <p className={`mt-3 text-[15px] ${tooMuch ? "text-danger" : "text-muted"}`}>
          {tooMuch
            ? adding
              ? "More than your balance"
              : "More than you've saved"
            : adding
              ? `${formatMoney(limit, currency)} in your balance`
              : `${formatMoney(limit, currency)} saved`}
        </p>
      </div>

      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {special && (
          <Chip selected={exact === special.units} onSelect={() => onPick(special.units)}>
            {special.label}
          </Chip>
        )}
        {adding &&
          quick.map((option) => (
            <Chip
              key={option.label}
              selected={exact === option.units}
              onSelect={() => onPick(option.units)}
            >
              {option.label}
            </Chip>
          ))}
      </div>

      <Keypad value={entry} onChange={onType} decimals={CURRENCIES[currency].decimals} />

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
          <Warning className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <Button full className="mt-4" disabled={amount === 0n || tooMuch} onClick={onSubmit}>
        {amount === 0n
          ? adding
            ? "Choose an amount"
            : "Choose how much"
          : adding
            ? `Add ${formatMoney(amount, currency)}`
            : `Withdraw ${formatMoney(amount, currency)}`}
      </Button>
      <p className="mt-2.5 text-center text-[13px] text-muted">No fee</p>
    </>
  );
}

function Chip({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`tabular h-10 shrink-0 whitespace-nowrap rounded-pill border px-4 text-[14px]
                  font-medium transition active:scale-95
                  ${selected ? "border-accent bg-accent/10 text-text" : "border-line bg-raised text-muted"}`}
    >
      {children}
    </button>
  );
}

/* ---------- the moment it is reached ---------- */

function Reached({ goal, amount, onDone }: { goal: Goal; amount: bigint; onDone: () => void }) {
  const { currency } = useKolo();

  return (
    <>
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <Confetti />

        <span className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-accent">
          <Check className="h-10 w-10 text-ink" />
        </span>

        <p className="mt-7 text-[28px] font-bold tracking-tight">You reached it</p>
        <p className="mt-2 max-w-[19rem] text-[16px] leading-relaxed text-muted">
          {formatMoney(goal.target, currency)} saved toward {goal.label || "your goal"}. That last{" "}
          {formatMoney(amount, currency)} did it.
        </p>
        <p className="mt-5 max-w-[19rem] text-[14px] leading-relaxed text-muted">
          Keep it set aside, or withdraw it whenever you&apos;re ready — it&apos;s yours either way.
        </p>
      </div>

      <Button full onClick={onDone}>
        Done
      </Button>
    </>
  );
}
