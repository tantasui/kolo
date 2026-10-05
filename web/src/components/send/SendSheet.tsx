"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "@/config";
import { resolveHandle } from "@/lib/registry";
import {
  formatApprox,
  formatEntry,
  formatMoney,
  handleProblem,
  normaliseHandle,
  parseAmount,
  spokenMoney,
  toEntry,
} from "@/lib/format";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { useKolo } from "../kolo-provider";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Confetti } from "../ui/Confetti";
import { Check, LinkIcon, Mic, Warning } from "../ui/Icons";
import { Keypad } from "../ui/Keypad";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";
import { useCreateClaimLink, type CreatedLink } from "@/hooks/useClaimLink";
import { listen, speak, speechSupported, stopSpeaking, type Listening } from "@/lib/speech";
import { parseAnswer } from "@/lib/voice";
import { ShareLink } from "./ShareLink";
import { VoiceStep, type Heard } from "./VoiceStep";

type Step = "voice" | "to" | "amount" | "review" | "sending" | "done" | "failed";

/**
 * Where a spoken send stands on the review screen. The review is always shown;
 * voice only decides whether "send" said aloud can stand in for the tap.
 */
type VoicePrompt =
  | { kind: "off" }
  | { kind: "asking"; overLimit: boolean }
  | { kind: "listening" }
  | { kind: "tap"; overLimit: boolean };

/**
 * Two ways to send: to a handle, or onto a link anyone can claim. The link
 * mode exists for the person who is not on Kolo yet.
 */
type Mode = "handle" | "link";

interface Recipient {
  handle: string;
  address: `0x${string}`;
}

export function SendSheet({ onClose, voice = false }: { onClose: () => void; voice?: boolean }) {
  const {
    balance,
    handle: myHandle,
    send,
    addPendingActivity,
    refreshBalance,
    refreshActivity,
    currency,
    activity,
  } = useKolo();
  const { create: createLink } = useCreateClaimLink();

  const [step, setStep] = useState<Step>(voice ? "voice" : "to");
  const [mode, setMode] = useState<Mode>("handle");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [link, setLink] = useState<CreatedLink | null>(null);
  const [entry, setEntry] = useState("");
  const [note, setNote] = useState("");
  /** What the handle field starts with when voice heard someone it couldn't find. */
  const [typed, setTyped] = useState("");

  const amount = parseAmount(entry, currency) ?? 0n;
  const available = balance ?? 0n;
  const tooMuch = amount > available;

  // Recognition only exists in the browser, so this is decided after mount.
  const [canListen, setCanListen] = useState(false);
  useEffect(() => setCanListen(speechSupported()), []);

  /** People in the feed, most recent first -- who a spoken name most likely means. */
  const known = useMemo(() => {
    const seen = new Set<string>();
    for (const item of activity) {
      if (item.kind === "payment" && item.counterpartyHandle) seen.add(item.counterpartyHandle);
    }
    return Array.from(seen);
  }, [activity]);

  const [prompt, setPrompt] = useState<VoicePrompt>({ kind: "off" });
  /** Bumped each time voice fills in a payment, so the review asks once per fill. */
  const [voiceTicket, setVoiceTicket] = useState(0);
  const askedRef = useRef(0);

  function onHeard(heard: Heard) {
    setMode("handle");
    setNote(trimNote(heard.note));

    let nextEntry = "";
    if (heard.amount) {
      // Said "10 dollars" with naira on screen: convert, so the keypad and the
      // review stay in the currency the person chose.
      const units = parseAmount(heard.amount, heard.currency ?? currency);
      if (units) nextEntry = toEntry(units, currency);
    }
    setEntry(nextEntry);
    setRecipient(heard.recipient);
    setTyped(heard.handle ?? "");

    if (!heard.recipient) {
      setStep("to");
      return;
    }

    const units = parseAmount(nextEntry, currency) ?? 0n;
    if (units === 0n || units > available) {
      setStep("amount");
      return;
    }

    setVoiceTicket((ticket) => ticket + 1);
    setStep("review");
  }

  // Refs, so a re-render of the parent mid-question does not restart it.
  const confirmRef = useRef<() => Promise<void>>(async () => {});
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // After a spoken send reaches the review: read it back, then listen for "send".
  useEffect(() => {
    if (step !== "review" || !recipient || voiceTicket === 0 || askedRef.current === voiceTicket) return;

    let cancelled = false;
    let listening: Listening | null = null;
    const overLimit = amount > config.voice.confirmLimit;

    (async () => {
      setPrompt({ kind: "asking", overLimit });
      await speak(
        `Send ${spokenMoney(amount, currency)} to ${recipient.handle.replace(/_/g, " underscore ")}? ` +
          (overLimit ? "Tap send to confirm." : "Say send to confirm.")
      );
      if (cancelled) return;
      askedRef.current = voiceTicket;

      if (overLimit) {
        setPrompt({ kind: "tap", overLimit: true });
        return;
      }

      setPrompt({ kind: "listening" });
      listening = listen();
      const outcome = await listening.result;
      if (cancelled) return;

      const answer = outcome.kind === "heard" ? parseAnswer(outcome.text) : "unclear";
      if (answer === "yes") {
        setPrompt({ kind: "off" });
        void confirmRef.current();
      } else if (answer === "no") {
        onCloseRef.current();
      } else {
        setPrompt({ kind: "tap", overLimit: false });
      }
    })();

    return () => {
      cancelled = true;
      listening?.cancel();
      stopSpeaking();
      setPrompt({ kind: "off" });
    };
  }, [step, recipient, voiceTicket, amount, currency]);

  async function confirm() {
    if (mode === "handle" && !recipient) return;
    setStep("sending");

    try {
      if (mode === "link") {
        // Nothing goes in the feed yet: the money is parked, not delivered.
        setLink(await createLink({ amount, note }));
        await refreshBalance();
        setStep("done");
        return;
      }

      await send({ handle: recipient!.handle, amount, note });

      // Show it in the feed straight away; the next sweep replaces this with
      // the confirmed row.
      addPendingActivity({
        direction: "out",
        counterpartyHandle: recipient!.handle,
        counterpartyAddress: recipient!.address,
        amount,
        memo: note,
      });

      await Promise.all([refreshBalance(), refreshActivity()]);
      setStep("done");
    } catch (error) {
      console.error(`[kolo] ${mode === "link" ? "link creation" : "send"} failed`, error);
      setStep("failed");
    }
  }
  confirmRef.current = confirm;

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col px-5 pb-8 pt-6">
        {step === "voice" && (
          <VoiceStep
            myHandle={myHandle}
            known={known}
            currencySymbol={CURRENCIES[currency].symbol}
            onHeard={onHeard}
            onType={() => setStep("to")}
            onClose={onClose}
          />
        )}

        {step === "to" && (
          <ToStep
            myHandle={myHandle}
            initialInput={typed}
            onVoice={canListen ? () => setStep("voice") : undefined}
            onClose={onClose}
            onPick={(picked) => {
              setMode("handle");
              setRecipient(picked);
              setStep("amount");
            }}
            onChooseLink={() => {
              setMode("link");
              setRecipient(null);
              setStep("amount");
            }}
          />
        )}

        {step === "amount" && (
          <AmountStep
            recipient={recipient}
            entry={entry}
            onEntry={setEntry}
            available={available}
            tooMuch={tooMuch}
            currency={currency}
            onBack={() => setStep("to")}
            onClose={onClose}
            onNext={() => setStep("review")}
          />
        )}

        {step === "review" && (
          <ReviewStep
            recipient={recipient}
            amount={amount}
            currency={currency}
            note={note}
            onNote={setNote}
            voice={prompt}
            onBack={() => setStep("amount")}
            onClose={onClose}
            onConfirm={confirm}
          />
        )}

        {step === "sending" && <SendingStep mode={mode} />}

        {step === "done" && mode === "link" && link && (
          <ShareLink url={link.url} amount={link.amount} currency={currency} onDone={onClose} />
        )}

        {step === "done" && mode === "handle" && recipient && (
          <DoneStep recipient={recipient} amount={amount} currency={currency} onDone={onClose} />
        )}

        {step === "failed" && (
          <FailedStep onRetry={() => setStep("review")} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

/* ---------- step 1: who ---------- */

type Lookup =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "checking" }
  | { kind: "found"; recipient: Recipient }
  | { kind: "self" }
  | { kind: "missing" }
  | { kind: "unknown" };

function ToStep({
  myHandle,
  initialInput,
  onVoice,
  onClose,
  onPick,
  onChooseLink,
}: {
  myHandle: string | null;
  initialInput: string;
  /** Absent where the browser cannot listen. */
  onVoice?: () => void;
  onClose: () => void;
  onPick: (recipient: Recipient) => void;
  onChooseLink: () => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [lookup, setLookup] = useState<Lookup>({ kind: "empty" });
  const requestRef = useRef(0);

  const handle = normaliseHandle(input);

  useEffect(() => {
    if (handle.length === 0) {
      setLookup({ kind: "empty" });
      return;
    }
    if (handleProblem(handle)) {
      setLookup({ kind: "invalid" });
      return;
    }
    if (myHandle && handle === myHandle) {
      setLookup({ kind: "self" });
      return;
    }

    setLookup({ kind: "checking" });
    const ticket = ++requestRef.current;

    const timer = setTimeout(async () => {
      try {
        const address = await resolveHandle(handle);
        if (ticket !== requestRef.current) return;
        setLookup(address ? { kind: "found", recipient: { handle, address } } : { kind: "missing" });
      } catch (error) {
        console.error("[kolo] lookup failed", error);
        if (ticket === requestRef.current) setLookup({ kind: "unknown" });
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [handle, myHandle]);

  return (
    <>
      <SheetHeader title="Send" onClose={onClose} />

      <div className="mt-8">
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface px-5 py-4 focus-within:border-muted">
          <span className="text-[26px] font-semibold text-accent">@</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="handle"
            aria-label="Recipient handle"
            className="w-full bg-transparent text-[26px] font-semibold tracking-tight text-text
                       outline-none placeholder:text-muted/50"
          />
          {onVoice && (
            <button
              type="button"
              onClick={onVoice}
              aria-label="Say it instead"
              className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted
                         transition active:scale-95"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-4 min-h-[76px]">
          <LookupResult lookup={lookup} onPick={onPick} />
        </div>
      </div>

      <div className="flex-1" />

      {config.features.claimLinks && (
        <button
          type="button"
          onClick={onChooseLink}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface
                     px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised text-muted">
            <LinkIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-text">Send a link instead</span>
            <span className="block text-[13px] text-muted">
              For someone who isn&apos;t on Kolo yet
            </span>
          </span>
        </button>
      )}

      <Button
        full
        disabled={lookup.kind !== "found"}
        onClick={() => lookup.kind === "found" && onPick(lookup.recipient)}
      >
        Continue
      </Button>
    </>
  );
}

function LookupResult({ lookup, onPick }: { lookup: Lookup; onPick: (r: Recipient) => void }) {
  switch (lookup.kind) {
    case "empty":
      return <p className="px-1 text-[15px] text-muted">Who are you sending to?</p>;
    case "invalid":
      return <p className="px-1 text-[15px] text-muted">Letters, numbers and _ only</p>;
    case "checking":
      return (
        <p className="flex items-center gap-2 px-1 text-[15px] text-muted">
          <Spinner className="h-4 w-4" /> Looking up…
        </p>
      );
    case "self":
      return <p className="px-1 text-[15px] text-muted">That&apos;s you</p>;
    case "missing":
      return <p className="px-1 text-[15px] text-danger">No one has that @handle</p>;
    case "unknown":
      return <p className="px-1 text-[15px] text-muted">Couldn&apos;t look that up — try again</p>;
    case "found":
      return (
        <button
          type="button"
          onClick={() => onPick(lookup.recipient)}
          className="flex w-full items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5
                     px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <Avatar handle={lookup.recipient.handle} />
          <span className="flex-1 text-[17px] font-semibold">@{lookup.recipient.handle}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent">
            <Check className="h-4 w-4 text-ink" />
          </span>
        </button>
      );
  }
}

/* ---------- step 2: how much ---------- */

function AmountStep({
  recipient,
  entry,
  onEntry,
  available,
  tooMuch,
  currency,
  onBack,
  onClose,
  onNext,
}: {
  recipient: Recipient | null;
  entry: string;
  onEntry: (next: string) => void;
  available: bigint;
  tooMuch: boolean;
  currency: Currency;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const amount = parseAmount(entry, currency) ?? 0n;

  return (
    <>
      <SheetHeader
        title={recipient ? `To @${recipient.handle}` : "Amount for the link"}
        onBack={onBack}
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col items-center justify-center">
        <p
          className={`tabular text-[60px] font-bold leading-none tracking-tight transition-colors ${
            entry === "" ? "text-muted/40" : tooMuch ? "text-danger" : "text-text"
          }`}
        >
          {formatEntry(entry, currency)}
        </p>
        <p className={`mt-4 text-[15px] ${tooMuch ? "text-danger" : "text-muted"}`}>
          {tooMuch ? "More than your balance" : `${formatMoney(available, currency)} available`}
        </p>
      </div>

      <Keypad value={entry} onChange={onEntry} decimals={CURRENCIES[currency].decimals} />

      <Button full className="mt-4" disabled={amount === 0n || tooMuch} onClick={onNext}>
        Continue
      </Button>
    </>
  );
}

/* ---------- step 3: review ---------- */

function ReviewStep({
  recipient,
  amount,
  currency,
  note,
  onNote,
  voice,
  onBack,
  onClose,
  onConfirm,
}: {
  recipient: Recipient | null;
  amount: bigint;
  currency: Currency;
  note: string;
  onNote: (next: string) => void;
  voice: VoicePrompt;
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <SheetHeader title="Review" onBack={onBack} onClose={onClose} />

      <div className="mt-10 text-center">
        <p className="text-[15px] text-muted">You&apos;re sending</p>
        <p className="tabular mt-2 text-[52px] font-bold leading-none tracking-tight">
          {formatMoney(amount, currency)}
        </p>
        {formatApprox(amount, currency) && (
          <p className="tabular mt-2 text-[15px] text-muted">{formatApprox(amount, currency)}</p>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 px-4 py-4">
          {recipient ? (
            <>
              <Avatar handle={recipient.handle} size={40} />
              <div className="flex-1">
                <p className="text-[13px] text-muted">To</p>
                <p className="text-[17px] font-semibold">@{recipient.handle}</p>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-muted">
                <LinkIcon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-[13px] text-muted">To</p>
                <p className="text-[17px] font-semibold">Anyone with the link</p>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-line px-4 py-4">
          <input
            value={note}
            onChange={(event) => {
              if (new TextEncoder().encode(event.target.value).length <= config.maxNoteBytes) {
                onNote(event.target.value);
              }
            }}
            placeholder="Add a note (optional)"
            aria-label="Note"
            className="w-full bg-transparent text-[16px] text-text outline-none placeholder:text-muted"
          />
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-4">
          <span className="text-[15px] text-muted">Fee</span>
          <span className="text-[15px] font-semibold text-accent">No fee</span>
        </div>
      </div>

      <div className="flex-1" />

      <VoiceBanner voice={voice} currency={currency} />

      <Button full onClick={onConfirm}>
        {recipient ? `Send ${formatMoney(amount, currency)}` : `Create a link for ${formatMoney(amount, currency)}`}
      </Button>
    </>
  );
}

function VoiceBanner({ voice, currency }: { voice: VoicePrompt; currency: Currency }) {
  if (voice.kind === "off") return null;

  const limit = formatMoney(config.voice.confirmLimit, currency);
  const overLimit = "overLimit" in voice && voice.overLimit;
  const message = overLimit
    ? `Over ${limit} — tap Send to confirm`
    : voice.kind === "tap"
      ? "Didn't catch that — tap Send to confirm"
      : "Say “send” to confirm, or tap";

  return (
    <p className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] text-muted">
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-text">
        {voice.kind === "listening" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-raised" aria-hidden />
        )}
        <Mic className="relative h-4 w-4" />
      </span>
      {message}
    </p>
  );
}

/** A spoken note, cut to what fits on chain without splitting a character. */
function trimNote(note: string): string {
  let trimmed = note;
  while (new TextEncoder().encode(trimmed).length > config.maxNoteBytes) {
    trimmed = Array.from(trimmed).slice(0, -1).join("");
  }
  return trimmed;
}

/* ---------- step 4: in flight ---------- */

function SendingStep({ mode }: { mode: Mode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5">
      <Spinner className="h-10 w-10 text-accent" />
      <p className="text-[18px] font-medium text-muted">
        {mode === "link" ? "Making your link…" : "Sending…"}
      </p>
    </div>
  );
}

/* ---------- step 5: done ---------- */

function DoneStep({
  recipient,
  amount,
  currency,
  onDone,
}: {
  recipient: Recipient;
  amount: bigint;
  currency: Currency;
  onDone: () => void;
}) {
  return (
    <>
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <Confetti />

        <span className="flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-accent">
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
            <path
              d="m5 13 4.5 4.5L19 7"
              stroke="#0A0A0C"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="48"
              className="animate-draw-check"
            />
          </svg>
        </span>

        <p className="tabular mt-7 text-[34px] font-bold tracking-tight">{formatMoney(amount, currency)}</p>
        <p className="mt-1.5 text-[17px] text-muted">sent to @{recipient.handle}</p>
      </div>

      <Button full onClick={onDone}>
        Done
      </Button>
    </>
  );
}

/* ---------- step 6: something broke ---------- */

function FailedStep({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15">
          <Warning className="h-8 w-8 text-danger" />
        </span>
        <p className="text-[19px] font-semibold">Something went wrong — try again</p>
        <p className="text-[15px] text-muted">Your money hasn&apos;t moved.</p>
      </div>

      <div className="space-y-3">
        <Button full onClick={onRetry}>
          Try again
        </Button>
        <Button full variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
