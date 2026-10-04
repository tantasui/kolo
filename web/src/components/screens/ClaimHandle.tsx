"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/config";
import { checkHandleAvailable } from "@/lib/registry";
import { handleProblem, normaliseHandle } from "@/lib/format";
import { takeWantedHandle } from "@/lib/wantedHandle";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Check, Close, Warning } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";
import { KoloMark } from "../ui/Wordmark";

type Availability =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "unknown" };

export function ClaimHandle() {
  const { claimHandle, accountReady } = useKolo();

  const [input, setInput] = useState("");
  const [availability, setAvailability] = useState<Availability>({
    kind: "empty",
  });
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = normaliseHandle(input);
  // Guards against a slow check overwriting a newer one.
  const requestRef = useRef(0);

  /* If they typed a name on /about before signing in, start with it. Read in
     an effect rather than in useState so the server and the first client
     render agree. */
  useEffect(() => {
    const wanted = takeWantedHandle();
    if (wanted) setInput(wanted);
  }, []);

  useEffect(() => {
    setError(null);

    if (handle.length === 0) {
      setAvailability({ kind: "empty" });
      return;
    }

    const problem = handleProblem(handle);
    if (problem) {
      setAvailability({ kind: "invalid", message: problem });
      return;
    }

    setAvailability({ kind: "checking" });
    const ticket = ++requestRef.current;

    const timer = setTimeout(async () => {
      try {
        const free = await checkHandleAvailable(handle);
        if (ticket !== requestRef.current) return;
        setAvailability({ kind: free ? "available" : "taken" });
      } catch (cause) {
        console.error("[kolo] availability check failed", cause);
        if (ticket === requestRef.current) setAvailability({ kind: "unknown" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [handle]);

  async function onClaim() {
    setClaiming(true);
    setError(null);
    try {
      await claimHandle(handle);
    } catch (cause) {
      console.error("[kolo] claim failed", cause);
      setError("Something went wrong — try again");
      setClaiming(false);
    }
  }

  return (
    <div className="bloom relative flex min-h-[100dvh] flex-col px-6 pb-8 pt-14">
      <KoloMark size={36} />

      <h1 className="mt-8 text-[32px] font-bold leading-tight tracking-tight">
        Pick your @handle
      </h1>
      <p className="mt-2 text-[16px] leading-relaxed text-muted">
        This is how friends send you money. Choose carefully — it&apos;s yours
        for good.
      </p>

      <div className="mt-8">
        <div
          className={`flex items-center gap-1 rounded-2xl border bg-surface px-5 py-4 transition
            ${availability.kind === "available" ? "border-accent" : "border-line focus-within:border-muted"}`}
        >
          <span className="text-[28px] font-semibold text-accent">@</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            maxLength={config.handle.maxLength + 4}
            placeholder="yourname"
            aria-label="Your handle"
            className="w-full bg-transparent text-[28px] font-semibold tracking-tight
                       text-text outline-none placeholder:text-muted/50"
          />
        </div>

        <div className="mt-3 flex min-h-[24px] items-center gap-2 px-1 text-[15px]">
          <StatusLine availability={availability} handle={handle} />
        </div>
      </div>

      <div className="flex-1" />

      {error && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
          <Warning className="h-5 w-5 shrink-0" />
          {error}
        </p>
      )}

      <Button
        full
        loading={claiming}
        disabled={availability.kind !== "available" || !accountReady}
        onClick={onClaim}
      >
        {availability.kind === "available"
          ? `Claim @${handle}`
          : "Claim your @handle"}
      </Button>
      <p className="mt-3 text-center text-[13px] text-muted">
        {claiming ? "Setting up your account…" : "Free, and takes a second."}
      </p>
    </div>
  );
}

function StatusLine({
  availability,
  handle,
}: {
  availability: Availability;
  handle: string;
}) {
  switch (availability.kind) {
    case "empty":
      return (
        <span className="text-muted">
          {config.handle.minLength}–{config.handle.maxLength} characters.
          Letters, numbers and _
        </span>
      );
    case "invalid":
      return <span className="text-muted">{availability.message}</span>;
    case "checking":
      return (
        <span className="flex items-center gap-2 text-muted">
          <Spinner className="h-4 w-4" /> Checking…
        </span>
      );
    case "available":
      return (
        <span className="flex items-center gap-2 font-medium text-accent">
          <Check className="h-4 w-4" /> @{handle} is yours
        </span>
      );
    case "taken":
      return (
        <span className="flex items-center gap-2 text-danger">
          <Close className="h-4 w-4" /> @{handle} is taken
        </span>
      );
    case "unknown":
      return (
        <span className="text-muted">
          Couldn&apos;t check that one — try again
        </span>
      );
  }
}
