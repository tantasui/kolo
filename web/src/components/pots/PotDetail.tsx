"use client";

import { useState } from "react";
import { config } from "@/config";
import { buildPotInviteUrl } from "@/lib/potInvite";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { formatApprox, formatEntry, formatMoney, initials, parseAmount } from "@/lib/format";
import { quickAmountUnits } from "@/lib/goals";
import { availableOf, unitsLeft, type PotMember } from "@/lib/pots";
import { usePotDetail } from "@/hooks/usePots";
import { useKolo } from "../kolo-provider";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Check, Copy, Share, Warning } from "../ui/Icons";
import { Keypad } from "../ui/Keypad";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";

type Mode = "view" | "topUp" | "working";

/**
 * One pot: what everybody put in, what they have used, and what each of them
 * still has.
 *
 * The three figures are shown per member rather than as a total, because a pot
 * has no total that belongs to anyone. The rows move on their own as uses land
 * -- the screen keeps asking rather than waiting for the viewer to do
 * something -- so somebody watching sees their share change when the other
 * person spends.
 */
export function PotDetail({ potId, onClose }: { potId: bigint; onClose: () => void }) {
  const { currency, balance, topUpPot, withdrawFromPot, closePot } = useKolo();
  const { detail, refresh } = usePotDetail(potId);

  const [mode, setMode] = useState<Mode>("view");
  const [entry, setEntry] = useState("");
  const [exact, setExact] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const amount = exact ?? parseAmount(entry, currency) ?? 0n;
  const available = balance ?? 0n;
  const tooMuch = amount > available;

  async function run(what: () => Promise<void>, failure: string) {
    setMode("working");
    setError(null);
    try {
      await what();
      await refresh();
      setMode("view");
    } catch (cause) {
      console.error(`[kolo] ${failure}`, cause);
      setError("Something went wrong — try again. Your money hasn't moved.");
      setMode("view");
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(buildPotInviteUrl(potId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      console.error("[kolo] copy failed", cause);
    }
  }

  async function shareInvite() {
    const url = buildPotInviteUrl(potId);
    if (typeof navigator.share !== "function") return copyInvite();
    try {
      await navigator.share({
        title: "Kolo",
        text: `Share ${detail?.name ?? "a pot"} with me on Kolo — you only pay for what you use. ${url}`,
      });
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      await copyInvite();
    }
  }

  const you = detail?.you;
  const yours = you ? availableOf(you) : 0n;
  const open = detail?.status === "open";

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-y-auto px-5 pb-8 pt-6">
        <SheetHeader title={detail?.name || "Pot"} onClose={onClose} />

        {!detail ? (
          <p className="mt-10 flex items-center gap-3 text-[15px] text-muted">
            <Spinner className="h-5 w-5" /> Opening the pot…
          </p>
        ) : mode === "topUp" ? (
          <TopUp
            currency={currency}
            entry={entry}
            exact={exact}
            amount={amount}
            available={available}
            tooMuch={tooMuch}
            onType={(next) => {
              setExact(null);
              setEntry(next);
            }}
            onPick={(units) => {
              setEntry("");
              setExact(units);
            }}
            onBack={() => setMode("view")}
            onSubmit={() =>
              run(async () => {
                await topUpPot(potId, amount);
                setEntry("");
                setExact(null);
              }, "top up failed")
            }
          />
        ) : mode === "working" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <Spinner className="h-10 w-10 text-accent" />
            <p className="text-[18px] font-medium text-muted">One moment…</p>
          </div>
        ) : (
          <>
            <section className="mt-8">
              <p className="text-[14px] font-medium text-muted">Your share, available to withdraw</p>
              <p className="tabular mt-1 text-[48px] font-bold leading-none tracking-tight">
                {formatMoney(yours, currency)}
              </p>
              {formatApprox(yours, currency) && (
                <p className="tabular mt-1.5 text-[15px] text-muted">
                  {formatApprox(yours, currency)}
                </p>
              )}
              {you && detail.price > 0n && (
                <p className="mt-3 text-[14px] text-muted">
                  {formatMoney(detail.price, currency)} a use — covers {unitsLeft(you, detail.price)}{" "}
                  more
                </p>
              )}
              {!open && (
                <p className="mt-3 rounded-2xl bg-raised px-4 py-3 text-[14px] leading-relaxed text-muted">
                  This pot is closed: nobody can put in or use it any more. Your share is still
                  yours, and you can withdraw it whenever you like.
                </p>
              )}
            </section>

            <section className="mt-8">
              <h2 className="mb-2 px-1 text-[14px] font-medium text-muted">
                Everyone in this pot
              </h2>
              <ul className="space-y-1">
                {detail.members.map((member) => (
                  <MemberRow key={member.account} member={member} currency={currency} />
                ))}
              </ul>
              <p className="mt-3 px-1 text-[13px] leading-relaxed text-muted">
                Each person pays only for what they use themselves. Nobody can spend from anybody
                else&apos;s share.
              </p>
            </section>

            {open && (
              <section className="mt-6 rounded-2xl border border-line bg-surface px-4 py-4">
                <p className="text-[15px] font-semibold text-text">Share this pot</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Whoever joins puts in their own money and spends only that.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={shareInvite}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-accent
                               text-[15px] font-semibold text-ink transition active:scale-[0.98]"
                  >
                    <Share className="h-4 w-4" /> Invite
                  </button>
                  <button
                    type="button"
                    onClick={copyInvite}
                    aria-label={copied ? "Invitation copied" : "Copy invitation"}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border
                               border-line bg-raised text-text transition active:scale-95"
                  >
                    {copied ? <Check className="h-5 w-5 text-accent" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </section>
            )}

            {error && (
              <p className="mt-6 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
                <Warning className="h-5 w-5 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex-1" />

            <div className="mt-8 space-y-3">
              {/* Deliberately the biggest thing here, and never hidden on a
                  closed pot: closing stops spending, it does not hold money. */}
              <Button
                full
                disabled={yours === 0n}
                onClick={() => run(() => withdrawFromPot(potId), "withdraw failed")}
              >
                {yours === 0n
                  ? "Nothing to withdraw"
                  : `Withdraw my share — ${formatMoney(yours, currency)}`}
              </Button>

              {open && (
                <Button full variant="secondary" onClick={() => setMode("topUp")}>
                  Put in more
                </Button>
              )}

              {open && detail.youAreCreator && (
                <Button
                  full
                  variant="ghost"
                  onClick={() => run(() => closePot(potId), "close failed")}
                >
                  Close this pot
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- one member's row ---------- */

function MemberRow({ member, currency }: { member: PotMember; currency: Currency }) {
  const available = availableOf(member);

  return (
    <li
      className={`rounded-2xl px-3 py-3 ${member.isYou ? "bg-raised" : "border border-line bg-surface"}`}
    >
      <div className="flex items-center gap-3">
        <Avatar handle={member.handle || initials(member.account)} size={32} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text">
          {member.isYou ? "You" : member.handle ? `@${member.handle}` : "A member"}
        </span>
        <span className="tabular shrink-0 text-[15px] font-semibold text-text">
          {formatMoney(available, currency)}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-[13px] text-muted">
        <span>
          Put in <span className="tabular text-text">{formatMoney(member.contributed, currency)}</span>
          {" · used "}
          <span className="tabular text-text">{formatMoney(member.used, currency)}</span>
        </span>
        <span className="shrink-0">available to withdraw</span>
      </div>
    </li>
  );
}

/* ---------- putting more in ---------- */

function TopUp({
  currency,
  entry,
  exact,
  amount,
  available,
  tooMuch,
  onType,
  onPick,
  onBack,
  onSubmit,
}: {
  currency: Currency;
  entry: string;
  exact: bigint | null;
  amount: bigint;
  available: bigint;
  tooMuch: boolean;
  onType: (next: string) => void;
  onPick: (units: bigint) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const shown = exact !== null ? formatMoney(exact, currency) : formatEntry(entry, currency);
  const empty = exact === null && entry === "";

  return (
    <>
      <div className="mt-2 flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 text-[15px] font-medium text-muted transition active:scale-95"
        >
          Back
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-[15px] text-muted">Put in</p>
        <p
          className={`tabular mt-2 text-[56px] font-bold leading-none tracking-tight ${
            empty ? "text-muted/40" : tooMuch ? "text-danger" : "text-text"
          }`}
        >
          {shown}
        </p>
        <p className={`mt-3 text-[15px] ${tooMuch ? "text-danger" : "text-muted"}`}>
          {tooMuch
            ? "More than your balance"
            : `${formatMoney(available, currency)} in your balance`}
        </p>
      </div>

      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {config.quickAmounts[currency].map((n) => {
          const units = quickAmountUnits(n, currency);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPick(units)}
              aria-pressed={exact === units}
              className={`tabular h-10 shrink-0 whitespace-nowrap rounded-pill border px-4 text-[14px]
                          font-medium transition active:scale-95
                          ${exact === units ? "border-accent bg-accent/10 text-text" : "border-line bg-raised text-muted"}`}
            >
              {formatMoney(units, currency)}
            </button>
          );
        })}
      </div>

      <Keypad value={entry} onChange={onType} decimals={CURRENCIES[currency].decimals} />

      <Button full className="mt-4" disabled={amount === 0n || tooMuch} onClick={onSubmit}>
        {amount === 0n ? "Choose an amount" : `Put in ${formatMoney(amount, currency)}`}
      </Button>
      <p className="mt-2.5 text-center text-[13px] text-muted">No fee</p>
    </>
  );
}
