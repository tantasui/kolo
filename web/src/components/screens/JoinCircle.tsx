"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { decodeInvite, frequencyLabel } from "@/lib/circleInvite";
import { formatApprox, formatMoney } from "@/lib/format";
import { lookUpInvite, type CircleInvite } from "@/hooks/useCircles";
import { useKolo } from "../kolo-provider";
import { DepositTerms } from "../circles/DepositTerms";
import { Button } from "../ui/Button";
import { Confetti } from "../ui/Confetti";
import { Check, Circle, Warning } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";
import { KoloMark } from "../ui/Wordmark";

type Lookup =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "gone" }
  | { kind: "full" }
  | { kind: "member" }
  | { kind: "open"; invite: CircleInvite };

type Stage = "idle" | "joining" | "done" | "declined" | "failed";

/**
 * An invitation to a circle.
 *
 * The numbers come first and the account comes second. Someone deciding
 * whether to put money into a rotating circle needs the position, the deposit
 * and the refund before they are asked for an email -- and must be able to say
 * no and leave without ever making one. Sign-in is the last step, not the door.
 *
 * The onboarding is the claim link's: show what is on offer, then Privy, then
 * one sponsored tap.
 */
export function JoinCircle() {
  const { ready, authenticated, login } = usePrivy();
  const { accountReady, currency, address, circles, joinCircle, refreshCircles } = useKolo();

  const [lookup, setLookup] = useState<Lookup>({ kind: "loading" });
  const [stage, setStage] = useState<Stage>("idle");
  const [circleId, setCircleId] = useState<bigint | null>(null);

  useEffect(() => {
    const id = decodeInvite(window.location.hash);
    if (!id) {
      setLookup({ kind: "invalid" });
      return;
    }
    setCircleId(id);
  }, []);

  const refresh = useCallback(
    async (id: bigint) => {
      try {
        const invite = await lookUpInvite(id);
        if (!invite) {
          setLookup({ kind: "gone" });
          return;
        }
        if (address && circles.some((circle) => circle.id === id)) {
          setLookup({ kind: "member" });
          return;
        }
        if (invite.status !== "forming" || invite.joined >= invite.size) {
          setLookup({ kind: "full" });
          return;
        }
        setLookup({ kind: "open", invite });
      } catch (error) {
        console.error("[kolo] could not read the invite", error);
        setLookup({ kind: "invalid" });
      }
    },
    [address, circles]
  );

  useEffect(() => {
    if (circleId) void refresh(circleId);
  }, [circleId, refresh]);

  async function onJoin() {
    if (lookup.kind !== "open") return;
    setStage("joining");
    try {
      await joinCircle(lookup.invite);
      await refreshCircles();
      setStage("done");
    } catch (error) {
      console.error("[kolo] join circle failed", error);
      const reason = String(error);
      setStage("failed");
      if (reason.includes("CircleFull") || reason.includes("CircleNotForming")) {
        setLookup({ kind: "full" });
      }
      if (circleId) void refresh(circleId);
    }
  }

  if (stage === "done" && lookup.kind === "open") {
    return <Joined invite={lookup.invite} />;
  }

  if (stage === "declined") {
    return (
      <Shell>
        <Message
          title="No problem"
          body="Nothing was taken and no account was made. You can close this."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {lookup.kind === "loading" && (
        <p className="flex items-center gap-3 text-[17px] text-muted">
          <Spinner className="h-5 w-5" /> Opening the invitation…
        </p>
      )}

      {lookup.kind === "invalid" && (
        <Message
          title="This invitation doesn't look right"
          body="Ask whoever sent it to share the link again — the part after the # matters."
        />
      )}

      {lookup.kind === "gone" && (
        <Message title="No circle here" body="This invitation doesn't point at anything." />
      )}

      {lookup.kind === "full" && (
        <Message
          title="This circle is full"
          body="Every place has been taken. Ask whoever invited you to start another one."
        />
      )}

      {lookup.kind === "member" && (
        <Message title="You're already in" body="You have a place in this circle already." />
      )}

      {lookup.kind === "open" && (
        <>
          <p className="text-[15px] text-muted">You&apos;ve been invited to</p>
          <h1 className="mt-1.5 text-[32px] font-bold leading-tight tracking-tight">
            {lookup.invite.name || "a circle"}
          </h1>

          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            <span className="font-semibold text-text">
              {formatMoney(lookup.invite.contribution, currency)}
            </span>{" "}
            {frequencyLabel(lookup.invite.roundDuration)}. Each round one member takes the whole
            pot, until everyone has had their turn.
          </p>
          {formatApprox(lookup.invite.contribution, currency) && (
            <p className="tabular mt-1 text-[14px] text-muted">
              {formatApprox(lookup.invite.contribution, currency)} each round
            </p>
          )}

          <p className="mt-4 flex items-center gap-2 text-[15px] text-muted">
            <Circle className="h-4 w-4" />
            {lookup.invite.joined} of {lookup.invite.size}{" "}
            {lookup.invite.joined === 1 ? "place" : "places"} taken
          </p>

          <div className="mt-6">
            <DepositTerms invite={lookup.invite} />
          </div>
        </>
      )}
    </Shell>
  );

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="bloom relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-14">
        <KoloMark size={36} />

        <div className="flex flex-1 flex-col justify-center py-8">{children}</div>

        {stage === "failed" && (
          <p className="mb-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
            <Warning className="h-5 w-5 shrink-0" />
            Something went wrong — try again
          </p>
        )}

        {lookup.kind === "open" && (
          <div className="space-y-3">
            {!authenticated ? (
              <Button full disabled={!ready} onClick={login}>
                Join this circle
              </Button>
            ) : (
              <Button full loading={stage === "joining"} disabled={!accountReady} onClick={onJoin}>
                {stage === "joining"
                  ? "Joining…"
                  : `Join — deposit ${formatMoney(lookup.invite.deposit, currency)}`}
              </Button>
            )}

            {/* Leaving must cost nothing, least of all an account. */}
            <Button full variant="ghost" onClick={() => setStage("declined")}>
              No thanks
            </Button>

            {!authenticated && (
              <p className="text-center text-[13px] text-muted">
                Use your email — nothing to download.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-raised">
        <Warning className="h-7 w-7 text-muted" />
      </span>
      <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
      <p className="mt-3 max-w-[20rem] text-[16px] leading-relaxed text-muted">{body}</p>
    </>
  );
}

function Joined({ invite }: { invite: CircleInvite }) {
  const { currency } = useKolo();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <Confetti />

      <span className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-accent">
        <Check className="h-10 w-10 text-ink" />
      </span>

      <p className="mt-7 text-[26px] font-bold tracking-tight">
        You&apos;re in {invite.name ? `“${invite.name}”` : "the circle"}
      </p>
      <p className="mt-2 max-w-[19rem] text-[16px] leading-relaxed text-muted">
        You have position {invite.nextPosition + 1} of {invite.size}. Your deposit of{" "}
        {formatMoney(invite.deposit, currency)} comes back in full when the circle completes.
      </p>

      <a
        href="/"
        className="mt-10 flex h-14 w-full max-w-xs items-center justify-center rounded-pill
                   bg-accent text-[17px] font-semibold text-ink transition active:scale-[0.98]"
      >
        Open Kolo
      </a>
    </div>
  );
}
