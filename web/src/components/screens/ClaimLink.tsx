"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import type { Hex } from "viem";
import { readSecretFromFragment } from "@/lib/claimLink";
import { formatApprox, formatMoney } from "@/lib/format";
import {
  lookUpLink,
  useClaimLink,
  type LinkLookup,
} from "@/hooks/useClaimLink";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Confetti } from "../ui/Confetti";
import { Check, Warning } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";
import { KoloMark } from "../ui/Wordmark";

type Stage = "idle" | "claiming" | "done" | "failed";

/**
 * What someone sees when they open a claim link.
 *
 * The secret is read from the fragment and never leaves the page. The amount
 * can be shown before signing in -- seeing what is waiting is what convinces
 * someone to make an account at all -- but claiming needs an account to pay.
 */
export function ClaimLink() {
  const { ready, authenticated, login } = usePrivy();
  const { accountReady, currency, refreshBalance, refreshActivity } = useKolo();
  const { claim } = useClaimLink();

  const [secret, setSecret] = useState<Hex | null>(null);
  const [lookup, setLookup] = useState<LinkLookup>({ kind: "loading" });
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    const found = readSecretFromFragment(window.location.hash);
    if (!found) {
      setLookup({ kind: "invalid" });
      return;
    }
    setSecret(found);
  }, []);

  const refresh = useCallback(async (value: Hex) => {
    try {
      setLookup(await lookUpLink(value));
    } catch (error) {
      console.error("[kolo] could not read link", error);
      setLookup({ kind: "invalid" });
    }
  }, []);

  useEffect(() => {
    if (secret) void refresh(secret);
  }, [secret, refresh]);

  async function onClaim() {
    if (lookup.kind !== "ready") return;
    setStage("claiming");
    try {
      await claim(lookup.secret);
      await Promise.all([refreshBalance(), refreshActivity()]);
      setStage("done");
    } catch (error) {
      console.error("[kolo] claim failed", error);
      setStage("failed");
      // Somebody may have got there first; show what is true now.
      if (secret) void refresh(secret);
    }
  }

  if (stage === "done")
    return (
      <Claimed
        amount={lookup.kind === "ready" ? lookup.amount : 0n}
        currency={currency}
      />
    );

  return (
    <div className="bloom relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-14">
      <KoloMark size={36} />

      <div className="flex flex-1 flex-col justify-center">
        {lookup.kind === "loading" && (
          <p className="flex items-center gap-3 text-[17px] text-muted">
            <Spinner className="h-5 w-5" /> Opening your link…
          </p>
        )}

        {lookup.kind === "invalid" && (
          <Message
            title="This link doesn't look right"
            body="Ask whoever sent it to share it again — the whole link matters, including the part after the #."
          />
        )}

        {lookup.kind === "gone" && (
          <Message
            title="Nothing left here"
            body="This one has already been collected, or the sender took it back."
          />
        )}

        {lookup.kind === "expired" && (
          <Message
            title="This link has expired"
            body="Links can be collected for 7 days. Ask the sender to send it again — their money is safe."
          />
        )}

        {lookup.kind === "ready" && (
          <>
            <Mascot />
            <p className="text-[17px] text-muted">Someone sent you</p>
            <p className="tabular mt-2 text-[52px] font-bold leading-none tracking-tight">
              {formatMoney(lookup.amount, currency)}
            </p>
            {formatApprox(lookup.amount, currency) && (
              <p className="tabular mt-2 text-[15px] text-muted">
                {formatApprox(lookup.amount, currency)}
              </p>
            )}
            <p className="mt-6 max-w-[20rem] text-[15px] leading-relaxed text-muted">
              It&apos;s yours to keep. Collect it into your Kolo balance —
              there&apos;s no fee, and nothing to set up beyond your email.
            </p>
          </>
        )}
      </div>

      {stage === "failed" && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
          <Warning className="h-5 w-5 shrink-0" />
          Something went wrong — try again
        </p>
      )}

      {lookup.kind === "ready" && (
        <>
          {!authenticated ? (
            <>
              <Button full disabled={!ready} onClick={login}>
                Collect {formatMoney(lookup.amount, currency)}
              </Button>
              <p className="mt-3 text-center text-[13px] text-muted">
                Use your email — nothing to download.
              </p>
            </>
          ) : (
            <>
              <Button
                full
                loading={stage === "claiming"}
                disabled={!accountReady}
                onClick={onClaim}
              >
                Collect {formatMoney(lookup.amount, currency)}
              </Button>
              <p className="mt-3 text-center text-[13px] text-muted">
                {stage === "claiming" ? "Collecting…" : "No fee."}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The one screen a stranger meets Kolo on.
 *
 * Everything else in the app is for somebody who already decided to be here;
 * this is a person who followed a link from a friend and has no idea what any
 * of it is. It is the only place in the app warm enough for a character, and
 * the only place that has to do emotional work before informational work.
 *
 * It sits *above* the amount, never beside it: DESIGN.md puts money at the top
 * of the type ladder as the largest thing on its screen, and a character level
 * with a 52px figure would compete with it.
 *
 * The art is greyscale, so the only thing tying it to Kolo is the coin. The
 * glow is placed behind where the coin sits in the frame -- it is what makes
 * the picture ours rather than a stock cartoon, and it is why the position is
 * a percentage of the image rather than a round number.
 */
function Mascot() {
  return (
    <div aria-hidden className="relative mx-auto mb-3 h-64 w-64 shrink-0">
      {/* Behind the coin, not behind the character. */}
      <span className="absolute left-[74%] top-[29%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/50 blur-2xl" />
      <Image
        src="/img/mascot.webp"
        alt=""
        fill
        priority
        sizes="256px"
        /* `mix-blend-screen` so the art's own black contributes nothing and
           there is no box around it -- the drawing sits on the page rather
           than in a panel on it. Over near-black the character itself is
           unchanged, so only the seam disappears. */
        className="relative object-contain mix-blend-screen
                   [mask-image:radial-gradient(closest-side,#000_72%,transparent_100%)]
                   [-webkit-mask-image:radial-gradient(closest-side,#000_72%,transparent_100%)]"
      />
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-raised">
        <Warning className="h-7 w-7 text-muted" />
      </span>
      <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">
        {title}
      </h1>
      <p className="mt-3 max-w-[20rem] text-[16px] leading-relaxed text-muted">
        {body}
      </p>
    </>
  );
}

function Claimed({
  amount,
  currency,
}: {
  amount: bigint;
  currency: Parameters<typeof formatMoney>[1];
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <Confetti />

      <span className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-accent">
        <Check className="h-10 w-10 text-ink" />
      </span>

      <p className="tabular mt-7 text-[34px] font-bold tracking-tight">
        {formatMoney(amount, currency)}
      </p>
      <p className="mt-1.5 text-[17px] text-muted">is in your balance</p>

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
