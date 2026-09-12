"use client";

import { useState } from "react";
import { config } from "@/config";
import { CURRENCIES } from "@/lib/currency";
import { depositFor } from "@/hooks/useCircles";
import { buildInviteUrl } from "@/lib/circleInvite";
import { formatApprox, formatEntry, formatMoney, parseAmount } from "@/lib/format";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Check, Copy, Share, WhatsApp } from "../ui/Icons";
import { Keypad } from "../ui/Keypad";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";

type Step = "amount" | "shape" | "review" | "creating" | "share" | "failed";

const PERIODS = config.circles.periods.filter(
  (period) => !period.demo || config.circles.showDemoRounds
);

/**
 * Starting a circle: how much, how often, how many, then the deposit.
 *
 * The deposit is the thing to be honest about. Whoever starts a circle is paid
 * first and so posts the most -- it is the largest number in the flow, and it
 * is stated in full on the way in rather than sprung at the end.
 */
export function CreateCircle({ onClose }: { onClose: () => void }) {
  const { currency, balance, createCircle } = useKolo();

  const [step, setStep] = useState<Step>("amount");
  const [entry, setEntry] = useState("");
  const [name, setName] = useState("");
  const [periodIndex, setPeriodIndex] = useState(PERIODS.length > 1 ? 1 : 0);
  const [size, setSize] = useState(4);
  const [inviteUrl, setInviteUrl] = useState("");

  const contribution = parseAmount(entry, currency) ?? 0n;
  const deposit = depositFor(size, 0, contribution);
  const available = balance ?? 0n;
  const tooMuch = deposit > available;

  async function confirm() {
    setStep("creating");
    try {
      const id = await createCircle({
        name: name.trim() || "Circle",
        contribution,
        size,
        roundDuration: PERIODS[periodIndex].seconds,
      });
      setInviteUrl(buildInviteUrl(id));
      setStep("share");
    } catch (error) {
      console.error("[kolo] could not start the circle", error);
      setStep("failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col px-5 pb-8 pt-6">
        {step === "amount" && (
          <>
            <SheetHeader title="New circle" onClose={onClose} />
            <div className="flex flex-1 flex-col items-center justify-center">
              <p className="text-[15px] text-muted">Everyone puts in</p>
              <p
                className={`tabular mt-2 text-[60px] font-bold leading-none tracking-tight ${
                  entry === "" ? "text-muted/40" : "text-text"
                }`}
              >
                {formatEntry(entry, currency)}
              </p>
              <p className="mt-3 text-[15px] text-muted">each round</p>
            </div>
            <Keypad value={entry} onChange={setEntry} decimals={CURRENCIES[currency].decimals} />
            <Button
              full
              className="mt-4"
              disabled={contribution === 0n}
              onClick={() => setStep("shape")}
            >
              Continue
            </Button>
          </>
        )}

        {step === "shape" && (
          <>
            <SheetHeader title="How it runs" onBack={() => setStep("amount")} onClose={onClose} />
            <div className="mt-8 space-y-7 overflow-y-auto">
              <Field label="Name it">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 24))}
                  placeholder="Rent, Family, School fees…"
                  aria-label="Circle name"
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[17px]
                             text-text outline-none placeholder:text-muted focus:border-muted"
                />
              </Field>

              <Field label="Payout comes round">
                <div className="space-y-2">
                  {PERIODS.map((period, index) => (
                    <Choice
                      key={period.label}
                      selected={index === periodIndex}
                      onSelect={() => setPeriodIndex(index)}
                    >
                      {period.label}
                      {period.demo && (
                        <span className="ml-2 text-[13px] text-muted">for showing people</span>
                      )}
                    </Choice>
                  ))}
                </div>
              </Field>

              <Field label={`How many people — ${size}`}>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    { length: config.circles.maxMembers - config.circles.minMembers + 1 },
                    (_, i) => i + config.circles.minMembers
                  ).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      aria-pressed={option === size}
                      className={`h-12 w-12 rounded-2xl border text-[17px] font-semibold transition
                                  active:scale-95
                                  ${
                                    option === size
                                      ? "border-accent bg-accent/10 text-text"
                                      : "border-line bg-surface text-muted"
                                  }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
                  {size} rounds, and everyone takes the pot once. Your deposit is{" "}
                  {formatMoney(depositFor(size, 0, contribution || 1n), currency)} because you are
                  paid first — later positions post less.
                </p>
              </Field>
            </div>
            <div className="flex-1" />
            <Button full className="mt-6" onClick={() => setStep("review")}>
              Continue
            </Button>
          </>
        )}

        {step === "review" && (
          <>
            <SheetHeader title="Review" onBack={() => setStep("shape")} onClose={onClose} />

            <div className="mt-8 text-center">
              <p className="text-[15px] text-muted">You put in</p>
              <p className="tabular mt-2 text-[46px] font-bold leading-none tracking-tight">
                {formatMoney(contribution, currency)}
              </p>
              <p className="mt-2 text-[15px] text-muted">
                {PERIODS[periodIndex].label.toLowerCase()}, for {size} rounds
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-line bg-surface">
              <Row label="Your position" value={`1 of ${size}`} note="You take the first pot" />
              <Row
                label="Deposit today"
                value={formatMoney(deposit, currency)}
                note={formatApprox(deposit, currency)}
                emphasis
              />
              <Row
                label="Refund"
                value="In full when the circle completes"
                note="If you miss a round your deposit covers it — top it back up and it stays whole"
                last
              />
            </div>

            {tooMuch && (
              <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
                That deposit is more than your balance. Try a smaller amount or fewer people.
              </p>
            )}

            <div className="flex-1" />
            <Button full disabled={tooMuch} onClick={confirm}>
              Start circle — {formatMoney(deposit, currency)}
            </Button>
            <p className="mt-3 text-center text-[13px] text-muted">No fee</p>
          </>
        )}

        {step === "creating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <Spinner className="h-10 w-10 text-accent" />
            <p className="text-[18px] font-medium text-muted">Starting your circle…</p>
          </div>
        )}

        {step === "share" && (
          <ShareCircle
            url={inviteUrl}
            name={name.trim() || "Circle"}
            contribution={contribution}
            size={size}
            onDone={onClose}
          />
        )}

        {step === "failed" && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[19px] font-semibold">Something went wrong — try again</p>
              <p className="text-[15px] text-muted">Your money hasn&apos;t moved.</p>
            </div>
            <div className="space-y-3">
              <Button full onClick={() => setStep("review")}>
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

/* ---------- the invite ---------- */

function ShareCircle({
  url,
  name,
  contribution,
  size,
  onDone,
}: {
  url: string;
  name: string;
  contribution: bigint;
  size: number;
  onDone: () => void;
}) {
  const { currency } = useKolo();
  const [copied, setCopied] = useState(false);

  const message =
    `Join my circle "${name}" on Kolo — ${formatMoney(contribution, currency)} each round, ` +
    `${size} of us, everyone takes the pot once. ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("[kolo] copy failed", error);
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ text: message });
      else await copy();
    } catch {
      // A cancelled share sheet is not a failure.
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex h-16 w-16 animate-pop-in items-center justify-center rounded-full bg-accent">
          <Check className="h-8 w-8 text-ink" />
        </span>
        <p className="mt-6 text-[24px] font-bold tracking-tight">{name} is open</p>
        <p className="mt-2 max-w-[19rem] text-[15px] leading-relaxed text-muted">
          It starts on its own once {size - 1} more {size - 1 === 1 ? "person joins" : "people join"}.
          Later positions post a smaller deposit — worth saying when you invite them.
        </p>

        <button
          type="button"
          onClick={copy}
          className="mt-7 w-full truncate rounded-2xl border border-line bg-surface px-4 py-3.5
                     text-left text-[14px] text-muted transition active:scale-[0.99]"
        >
          {url}
        </button>
      </div>

      <div className="space-y-3">
        <Button full onClick={share}>
          <Share className="h-5 w-5" />
          Share invite
        </Button>
        <div className="flex gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-pill border
                       border-line bg-raised text-[17px] font-semibold text-text transition
                       active:scale-[0.98]"
          >
            <WhatsApp className="h-5 w-5" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={copy}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-pill border
                       border-line bg-raised text-[17px] font-semibold text-text transition
                       active:scale-[0.98]"
          >
            {copied ? <Check className="h-5 w-5 text-accent" /> : <Copy className="h-5 w-5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <Button full variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    </>
  );
}

/* ---------- small parts ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[14px] font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

function Choice({
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
      className={`flex w-full items-center rounded-2xl border px-4 py-3.5 text-left text-[17px]
                  transition active:scale-[0.99]
                  ${selected ? "border-accent bg-accent/5 text-text" : "border-line bg-surface text-muted"}`}
    >
      {children}
    </button>
  );
}

function Row({
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
    <div className={`px-4 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="shrink-0 text-[15px] text-muted">{label}</span>
        <span
          className={`tabular text-right font-semibold text-text ${emphasis ? "text-[20px]" : "text-[15px]"}`}
        >
          {value}
        </span>
      </div>
      {note && <p className="mt-1 text-[13px] leading-relaxed text-muted">{note}</p>}
    </div>
  );
}
