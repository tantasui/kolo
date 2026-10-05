"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { handleProblem } from "@/lib/format";
import { resolveHandle } from "@/lib/registry";
import { listen, type Listening } from "@/lib/speech";
import { matchHandle, parseCommand, type SpokenCurrency } from "@/lib/voice";
import { Button } from "../ui/Button";
import { Mic } from "../ui/Icons";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";

/** What was understood, with the handle already looked up where it could be. */
export interface Heard {
  /** The handle that was heard, after snapping to someone familiar. */
  handle: string | null;
  /** Set only when that handle belongs to somebody other than you. */
  recipient: { handle: string; address: `0x${string}` } | null;
  amount: string | null;
  currency: SpokenCurrency | null;
  note: string;
}

type Listen =
  | { kind: "idle" }
  | { kind: "listening"; heard: string }
  | { kind: "working"; heard: string }
  | { kind: "unclear"; heard: string }
  | { kind: "denied" }
  | { kind: "failed" };

export function VoiceStep({
  myHandle,
  known,
  currencySymbol,
  onHeard,
  onType,
  onClose,
}: {
  myHandle: string | null;
  /** Handles from the feed, most recent first: the people most likely meant. */
  known: string[];
  currencySymbol: string;
  onHeard: (heard: Heard) => void;
  onType: () => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<Listen>({ kind: "idle" });
  const listeningRef = useRef<Listening | null>(null);
  const aliveRef = useRef(true);

  // Listening outlives renders, so it reads the latest props rather than the
  // ones it started with -- the balance may have moved in between.
  const propsRef = useRef({ myHandle, known, onHeard });
  useEffect(() => {
    propsRef.current = { myHandle, known, onHeard };
  });

  const understand = useCallback(
    async (text: string) => {
      const { myHandle, known } = propsRef.current;
      const command = parseCommand(text);
      if (!command.handle && !command.amount) {
        setState({ kind: "unclear", heard: text });
        return;
      }

      setState({ kind: "working", heard: text });
      const handle = command.handle ? matchHandle(command.handle, known) : null;

      let recipient: Heard["recipient"] = null;
      if (handle && !handleProblem(handle) && handle !== myHandle) {
        try {
          const address = await resolveHandle(handle);
          if (address) recipient = { handle, address };
        } catch (error) {
          console.error("[kolo] lookup failed", error);
        }
      }

      if (!aliveRef.current) return;
      propsRef.current.onHeard({
        handle,
        recipient,
        amount: command.amount,
        currency: command.currency,
        note: command.note,
      });
    },
    []
  );

  const start = useCallback(async () => {
    listeningRef.current?.cancel();
    setState({ kind: "listening", heard: "" });

    const listening = listen((heard) => {
      if (aliveRef.current) setState({ kind: "listening", heard });
    });
    listeningRef.current = listening;

    const outcome = await listening.result;
    if (!aliveRef.current || listeningRef.current !== listening) return;
    listeningRef.current = null;

    switch (outcome.kind) {
      case "heard":
        return understand(outcome.text);
      case "silent":
        return setState({ kind: "idle" });
      case "denied":
        return setState({ kind: "denied" });
      case "failed":
        return setState({ kind: "failed" });
    }
  }, [understand]);

  // Start straight away: the person just tapped a mic to get here.
  useEffect(() => {
    aliveRef.current = true;
    void start();
    return () => {
      aliveRef.current = false;
      listeningRef.current?.cancel();
      listeningRef.current = null;
    };
    // Once per visit, not once per change of `start`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listening = state.kind === "listening";
  const heard = "heard" in state ? state.heard : "";

  return (
    <>
      <SheetHeader title="Send" onClose={onClose} />

      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
        <button
          type="button"
          onClick={() => (listening ? listeningRef.current?.stop() : void start())}
          disabled={state.kind === "working"}
          aria-label={listening ? "Stop listening" : "Start listening"}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent text-ink
                     transition active:scale-95 disabled:opacity-60"
        >
          {listening && (
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" aria-hidden />
          )}
          {state.kind === "working" ? <Spinner className="h-8 w-8" /> : <Mic className="h-10 w-10" />}
        </button>

        <p className="mt-8 min-h-[56px] max-w-[300px] text-[22px] font-semibold leading-snug tracking-tight">
          {heard ? `“${heard}”` : <Prompt state={state} />}
        </p>

        <p className="mt-3 text-[15px] text-muted">
          <Hint state={state} symbol={currencySymbol} />
        </p>
      </div>

      <Button full variant="secondary" onClick={onType}>
        Type it instead
      </Button>
    </>
  );
}

function Prompt({ state }: { state: Listen }) {
  switch (state.kind) {
    case "listening":
      return <>Listening…</>;
    case "denied":
      return <>Kolo can&apos;t hear you</>;
    case "failed":
      return <>Something went wrong — try again</>;
    case "idle":
    case "working":
    case "unclear":
      return <>Tap and speak</>;
  }
}

function Hint({ state, symbol }: { state: Listen; symbol: string }) {
  switch (state.kind) {
    case "denied":
      return <>Allow the microphone for Kolo in your browser settings</>;
    case "working":
      return <>Getting that ready…</>;
    case "unclear":
      return <>Didn&apos;t catch who or how much — try again</>;
    case "idle":
    case "listening":
    case "failed":
      return <>Try “Send {symbol === "₦" ? "₦5,000" : "$10"} to @tolu for lunch”</>;
  }
}
