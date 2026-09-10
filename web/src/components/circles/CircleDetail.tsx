"use client";

import { useState } from "react";
import { dueLabel, secondsUntilDue, type CircleSummary } from "@/hooks/useCircles";
import { payoutHistory, useCircleDetail, type Seat } from "@/hooks/useCircleDetail";
import { buildInviteUrl } from "@/lib/circleInvite";
import type { Currency } from "@/lib/currency";
import { formatApprox, formatMoney } from "@/lib/format";
import { initials } from "@/lib/format";
import { useKolo } from "../kolo-provider";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Check, Copy, Share, Warning } from "../ui/Icons";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";

/**
 * One circle in full: where the rotation has got to, what this round needs,
 * and the one thing the viewer can do about it.
 *
 * Being Behind is stated plainly and worded kindly. A member who missed did
 * not cheat anyone -- their own deposit covered the round, which is exactly
 * what it is for -- so the rotation says "deposit covering them" rather than
 * naming a failure, and the viewer's own row offers the way back rather than
 * a penalty.
 */
export function CircleDetail({ circle, onClose }: { circle: CircleSummary; onClose: () => void }) {
  const { currency, contributeToCircle, cureCircle } = useKolo();
  const { detail, refresh } = useCircleDetail(circle.id);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function act(kind: "contribute" | "cure") {
    setBusy(true);
    setError(null);
    try {
      await (kind === "cure" ? cureCircle(circle) : contributeToCircle(circle));
      await refresh();
    } catch (cause) {
      console.error("[kolo] circle action failed", cause);
      setError(
        String(cause).includes("AlreadyContributed")
          ? "You've already put in for this round"
          : "Something went wrong — try again"
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(circle.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      console.error("[kolo] copy failed", cause);
    }
  }

  async function shareInvite() {
    const url = buildInviteUrl(circle.id);
    if (typeof navigator.share !== "function") return copyInvite();
    try {
      await navigator.share({ title: "Kolo", text: `Join my circle on Kolo: ${circle.name}. ${url}` });
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      await copyInvite();
    }
  }

  const you = detail?.you;
  const behind = !!you && you.depositDrawn > 0n;
  const owesThisRound = !!you && !you.paidThisRound && detail?.status === "running";
  const history = detail ? payoutHistory(detail) : [];

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-y-auto px-5 pb-8 pt-6">
        <SheetHeader title={circle.name || "Circle"} onClose={onClose} />

        {!detail ? (
          <p className="mt-10 flex items-center gap-3 text-[15px] text-muted">
            <Spinner className="h-5 w-5" /> Opening the circle…
          </p>
        ) : (
          <>
            <RoundProgress detail={detail} currency={currency} />

            {behind && you && <BehindNotice owed={you.depositDrawn} currency={currency} />}

            <Rotation detail={detail} currency={currency} />

            {detail.status === "forming" && (
              <section className="mt-6 rounded-2xl border border-line bg-surface px-4 py-4">
                <p className="text-[15px] font-semibold text-text">
                  {detail.size - detail.seats.length}{" "}
                  {detail.size - detail.seats.length === 1 ? "place" : "places"} left
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  The circle starts when it fills. Whoever joins sees their position and deposit
                  first.
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

            {you && <DepositStatus seat={you} currency={currency} />}

            {history.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-2 px-1 text-[14px] font-medium text-muted">Rounds paid out</h2>
                <ul className="space-y-1">
                  {history.map((seat) => (
                    <li
                      key={seat.account}
                      className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5"
                    >
                      <Avatar handle={seat.handle || initials(seat.account)} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-text">
                          {seat.isYou ? "You" : seat.handle ? `@${seat.handle}` : "A member"}
                        </span>
                        <span className="block text-[13px] text-muted">
                          Round {seat.paidInRound + 1}
                        </span>
                      </span>
                      <span className="tabular text-[15px] font-semibold text-inbound">
                        +&#8202;{formatMoney(detail.pot, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
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
              {behind && (
                <Button full loading={busy} onClick={() => act("cure")}>
                  Restore deposit — {formatMoney(you!.depositDrawn, currency)}
                </Button>
              )}
              {owesThisRound && (
                <Button
                  full
                  variant={behind ? "secondary" : "primary"}
                  loading={busy}
                  onClick={() => act("contribute")}
                >
                  Contribute {formatMoney(detail.contribution, currency)}
                </Button>
              )}
              {!behind && !owesThisRound && detail.status === "running" && (
                <p className="text-center text-[15px] text-muted">
                  You&apos;re in for this round. Nothing to do until the next one.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- round progress ---------- */

export function RoundProgress({
  detail,
  currency,
}: {
  detail: NonNullable<ReturnType<typeof useCircleDetail>["detail"]>;
  currency: Currency;
}) {
  const seconds = secondsUntilDue({ roundEndsAt: detail.roundEndsAt } as CircleSummary);
  const overdue = seconds <= 0;
  const pct = detail.size === 0 ? 0 : Math.round((detail.paidInCount / detail.size) * 100);

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <p className="text-[14px] font-medium text-muted">
          {detail.status === "forming"
            ? "Waiting to fill"
            : detail.status === "complete"
              ? "Finished"
              : `Round ${detail.round + 1} of ${detail.size}`}
        </p>
        {detail.status === "running" && (
          <p className={`text-[14px] ${overdue ? "text-danger" : "text-muted"}`}>
            {overdue ? "Closing now" : `Closes ${dueLabel(seconds)}`}
          </p>
        )}
      </div>

      <p className="tabular mt-2 text-[40px] font-bold leading-none tracking-tight">
        {formatMoney(detail.pot, currency)}
      </p>
      <p className="mt-1 text-[14px] text-muted">
        the pot this round{formatApprox(detail.pot, currency) ? ` · ${formatApprox(detail.pot, currency)}` : ""}
      </p>

      {detail.status === "running" && (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-pill bg-raised">
            <div
              className="h-full rounded-pill bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] text-muted">
            {detail.paidInCount} of {detail.size} have contributed
          </p>
        </>
      )}
    </section>
  );
}

/* ---------- the viewer being behind ---------- */

export function BehindNotice({ owed, currency }: { owed: bigint; currency: Currency }) {
  return (
    <section className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-4">
      <p className="text-[15px] font-semibold text-text">Your deposit covered you</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
        A round was paid out of your deposit, so nobody in the circle was short. Restore{" "}
        {formatMoney(owed, currency)} and you go straight back into the rotation — your place is
        still yours.
      </p>
    </section>
  );
}

/* ---------- the rotation ---------- */

const SEAT_COPY: Record<Seat["state"], { label: string; tone: string }> = {
  received: { label: "Took the pot", tone: "text-muted" },
  next: { label: "Next to be paid", tone: "text-accent" },
  // Said gently and without blame: the deposit is doing the job it was posted for.
  behind: { label: "Deposit covering them", tone: "text-danger" },
  waiting: { label: "Waiting their turn", tone: "text-muted" },
};

export function Rotation({
  detail,
  currency,
}: {
  detail: NonNullable<ReturnType<typeof useCircleDetail>["detail"]>;
  currency: Currency;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 px-1 text-[14px] font-medium text-muted">Payout order</h2>

      <ul className="space-y-1">
        {detail.seats.map((seat) => {
          const { label, tone } = SEAT_COPY[seat.state];
          const sub =
            seat.state === "received" ? `${label} in round ${seat.paidInRound + 1}` : label;

          return (
            <li
              key={seat.account}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                seat.isYou ? "bg-raised" : ""
              }`}
            >
              <span className="w-5 shrink-0 text-center text-[13px] tabular text-muted">
                {seat.position + 1}
              </span>

              <Avatar handle={seat.handle || initials(seat.account)} size={36} />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-text">
                  {seat.isYou ? "You" : seat.handle ? `@${seat.handle}` : "A member"}
                </span>
                <span className={`block truncate text-[13px] ${tone}`}>{sub}</span>
              </span>

              {/* This round's contribution, kept separate from the rotation
                  state: they answer different questions. */}
              {detail.status === "running" && (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    seat.paidThisRound ? "bg-accent text-ink" : "border border-line text-muted"
                  }`}
                  aria-label={seat.paidThisRound ? "Contributed this round" : "Not in yet"}
                >
                  {seat.paidThisRound ? <Check className="h-4 w-4" /> : <span className="text-[13px]">·</span>}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 px-1 text-[13px] leading-relaxed text-muted">
        Each round one member takes {formatMoney(detail.pot, currency)}. Anyone whose deposit is
        covering them is passed over until they restore it, and keeps their place.
      </p>
    </section>
  );
}

/* ---------- deposit ---------- */

export function DepositStatus({ seat, currency }: { seat: Seat; currency: Currency }) {
  const whole = seat.depositDrawn === 0n;
  const left = seat.deposit - seat.depositDrawn;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface px-4 py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] text-muted">Your deposit</span>
        <span className="tabular text-[15px] font-semibold text-text">
          {formatMoney(seat.deposit, currency)}
        </span>
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        {whole
          ? "Untouched, and returned in full when the circle completes."
          : left === 0n
            ? "All of it has covered rounds for you. Restore it and it comes back whole."
            : `${formatMoney(left, currency)} of it is left — the rest covered a round for you. Restore it and it comes back whole.`}
      </p>
    </section>
  );
}
