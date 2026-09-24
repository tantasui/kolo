"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CURRENCIES } from "@/lib/currency";
import { formatEntry, formatMoney, parseAmount } from "@/lib/format";
import { decodePotInvite } from "@/lib/potInvite";
import type { PotDetail } from "@/lib/pots";
import { readPotDetail } from "@/hooks/usePots";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Check, Warning } from "../ui/Icons";
import { Keypad } from "../ui/Keypad";
import { Spinner } from "../ui/Spinner";
import { KoloMark } from "../ui/Wordmark";

type Lookup =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "gone" }
  | { kind: "closed" }
  | { kind: "member" }
  | { kind: "open"; pot: PotDetail };

type Stage = "idle" | "amount" | "joining" | "done" | "declined" | "failed";

/**
 * An invitation to share a pot.
 *
 * The terms come before the account, as with a circle: what one use costs, who
 * is already in, and the fact that whatever you put in stays yours. Joining a
 * pot risks less than joining a circle -- you can only ever spend your own
 * money -- so the page says that plainly rather than asking for trust.
 */
export function JoinPot() {
  const { ready, authenticated, login } = usePrivy();
  const { accountReady, address, currency, balance, joinPot } = useKolo();

  const [potId, setPotId] = useState<bigint | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ kind: "loading" });
  const [stage, setStage] = useState<Stage>("idle");
  const [entry, setEntry] = useState("");

  const amount = parseAmount(entry, currency) ?? 0n;
  const available = balance ?? 0n;
  const tooMuch = amount > available;

  useEffect(() => {
    const id = decodePotInvite(window.location.hash);
    if (!id) {
      setLookup({ kind: "invalid" });
      return;
    }
    setPotId(id);
  }, []);

  const refresh = useCallback(
    async (id: bigint) => {
      try {
        const pot = await readPotDetail(id, address);
        if (!pot) return setLookup({ kind: "gone" });
        if (pot.you) return setLookup({ kind: "member" });
        if (pot.status !== "open") return setLookup({ kind: "closed" });
        setLookup({ kind: "open", pot });
      } catch (error) {
        console.error("[kolo] could not read the pot invitation", error);
        setLookup({ kind: "invalid" });
      }
    },
    [address]
  );

  useEffect(() => {
    if (potId !== null) void refresh(potId);
  }, [potId, refresh]);

  async function join() {
    if (potId === null) return;
    setStage("joining");
    try {
      await joinPot(potId, amount);
      setStage("done");
    } catch (error) {
      console.error("[kolo] join pot failed", error);
      setStage("failed");
      void refresh(potId);
    }
  }

  if (stage === "done" && lookup.kind === "open") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-accent">
            <Check className="h-10 w-10 text-ink" />
          </span>
          <p className="mt-7 text-[26px] font-bold tracking-tight">You&apos;re in</p>
          <p className="mt-2 max-w-[19rem] text-[16px] leading-relaxed text-muted">
            You put in {formatMoney(amount, currency)}. You pay only for what you use, and the rest
            stays available to withdraw.
          </p>
          <a
            href="/"
            className="mt-10 flex h-14 w-full max-w-xs items-center justify-center rounded-pill
                       bg-accent text-[17px] font-semibold text-ink transition active:scale-[0.98]"
          >
            Open Kolo
          </a>
        </div>
      </Shell>
    );
  }

  if (stage === "declined") {
    return (
      <Shell>
        <Message title="No problem" body="Nothing was taken and no account was made." />
      </Shell>
    );
  }

  // "joining" stays on this screen: dropping back to the invitation while the
  // operation is in flight would look like the tap did nothing.
  if ((stage === "amount" || stage === "joining") && lookup.kind === "open") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-[15px] text-muted">Put in</p>
          <p
            className={`tabular mt-2 text-[56px] font-bold leading-none tracking-tight ${
              entry === "" ? "text-muted/40" : tooMuch ? "text-danger" : "text-text"
            }`}
          >
            {formatEntry(entry, currency)}
          </p>
          <p className={`mt-3 text-[15px] ${tooMuch ? "text-danger" : "text-muted"}`}>
            {tooMuch
              ? "More than your balance"
              : `${formatMoney(available, currency)} in your balance`}
          </p>
        </div>
        <Keypad value={entry} onChange={setEntry} decimals={CURRENCIES[currency].decimals} />
        <Button
          full
          className="mt-4"
          loading={stage === "joining"}
          disabled={amount === 0n || tooMuch || !accountReady}
          onClick={join}
        >
          {amount === 0n ? "Choose an amount" : `Join with ${formatMoney(amount, currency)}`}
        </Button>
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
      {lookup.kind === "gone" && <Message title="No pot here" body="This invitation doesn't point at anything." />}
      {lookup.kind === "closed" && (
        <Message title="This pot is closed" body="It isn't taking new people. Ask whoever invited you to start another." />
      )}
      {lookup.kind === "member" && <Message title="You're already in" body="You have a share in this pot already." />}

      {lookup.kind === "open" && (
        <>
          <p className="text-[15px] text-muted">You&apos;ve been invited to share</p>
          <h1 className="mt-1.5 text-[32px] font-bold leading-tight tracking-tight">
            {lookup.pot.name || "a pot"}
          </h1>

          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            One use costs{" "}
            <span className="font-semibold text-text">{formatMoney(lookup.pot.price, currency)}</span>
            . You put in your own money and pay only for what you use yourself.
          </p>

          <p className="mt-4 text-[15px] text-muted">
            {lookup.pot.memberCount} {lookup.pot.memberCount === 1 ? "person is" : "people are"}{" "}
            already in
          </p>

          <div className="mt-6 rounded-2xl border border-line bg-surface px-4 py-4">
            <p className="text-[15px] font-semibold text-text">Whatever you don&apos;t use stays yours</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Nobody else can spend your share, and it is available to withdraw at any time —
              including after the pot is closed.
            </p>
          </div>
        </>
      )}

      {stage === "failed" && (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
          <Warning className="h-5 w-5 shrink-0" />
          Something went wrong — try again
        </p>
      )}

      {lookup.kind === "open" && (
        <div className="mt-8 space-y-3">
          {!authenticated ? (
            <Button full disabled={!ready} onClick={login}>
              Join this pot
            </Button>
          ) : (
            <Button full disabled={!accountReady} onClick={() => setStage("amount")}>
              Join this pot
            </Button>
          )}
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bloom relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-14">
      <KoloMark size={36} />
      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
    </div>
  );
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
