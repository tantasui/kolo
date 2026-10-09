"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/config";
import { handleProblem, normaliseHandle } from "@/lib/format";
import { checkHandleAvailable } from "@/lib/registry";
import { rememberWantedHandle } from "@/lib/wantedHandle";
import { Check, Close, Warning } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";

/**
 * "Is @yourname free?" -- asked of the registry, on the landing page.
 *
 * The obvious version of this field is decorative: collect a string, show a
 * tick, send an email later. This one actually reads
 * `KoloRegistry.isAvailable`, so the answer on the page is the answer the app
 * will give. It is the same debounce-and-ticket pattern the real claim screen
 * uses, for the same reason: a slow reply must never overwrite a newer one.
 *
 * Taking it forward carries the handle into the app rather than asking for it
 * twice. If the check cannot reach the chain, the field says so and still lets
 * you through -- a landing page is not the place to block someone on an RPC.
 */
type State =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "unknown" };

export function HandleCTA() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [state, setState] = useState<State>({ kind: "empty" });
  const requestRef = useRef(0);

  const handle = normaliseHandle(input);

  useEffect(() => {
    if (handle.length === 0) {
      setState({ kind: "empty" });
      return;
    }

    const problem = handleProblem(handle);
    if (problem) {
      setState({ kind: "invalid", message: problem });
      return;
    }

    setState({ kind: "checking" });
    const ticket = ++requestRef.current;

    const timer = setTimeout(async () => {
      try {
        const free = await checkHandleAvailable(handle);
        if (ticket !== requestRef.current) return;
        setState({ kind: free ? "available" : "taken" });
      } catch (error) {
        console.error("[kolo] availability check failed", error);
        if (ticket === requestRef.current) setState({ kind: "unknown" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [handle]);

  function go() {
    if (handle) rememberWantedHandle(handle);
    router.push("/app");
  }

  const blocked = state.kind === "invalid" || state.kind === "taken";

  return (
    <div className="w-full max-w-lg">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) go();
        }}
        className="flex flex-col gap-2 rounded-xl2 border border-rule-soft bg-card p-2
                   transition focus-within:border-grass sm:flex-row sm:items-center sm:rounded-pill"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 px-3 sm:px-3">
          <span
            aria-hidden
            className="font-mono text-[18px] font-semibold text-body-soft"
          >
            @
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="yourname"
            aria-label="Choose a handle"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={config.handle.maxLength + 4}
            className="h-11 w-full min-w-0 bg-transparent text-[18px] text-deep outline-none
                       placeholder:text-body-soft"
          />
          <Status state={state} />
        </div>

        <button
          type="submit"
          disabled={blocked}
          className="flex h-12 shrink-0 items-center justify-center rounded-pill bg-spring px-6
                     text-[16px] font-semibold text-on-spring transition hover:bg-spring-dim
                     active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          Claim it
        </button>
      </form>

      <p className="mt-3 min-h-[1.25rem] text-[13px] text-body-soft">
        {hint(state, handle)}
      </p>
    </div>
  );
}

function Status({ state }: { state: State }) {
  if (state.kind === "checking")
    return <Spinner className="h-4 w-4 shrink-0 text-body-soft" />;
  if (state.kind === "available")
    return <Check className="h-5 w-5 shrink-0 text-grass" />;
  if (state.kind === "taken")
    return <Close className="h-5 w-5 shrink-0 text-alert" />;
  if (state.kind === "unknown")
    return <Warning className="h-5 w-5 shrink-0 text-body-soft" />;
  return null;
}

function hint(state: State, handle: string): string {
  switch (state.kind) {
    case "empty":
      return "Yours in one tap, free";
    case "invalid":
      return state.message;
    case "checking":
      return "Checking…";
    case "available":
      return `@${handle} is free — it is yours`;
    case "taken":
      return `@${handle} is taken — try another`;
    case "unknown":
      return "Could not check just now — carry on anyway";
  }
}
