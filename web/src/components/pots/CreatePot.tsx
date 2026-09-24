"use client";

import { useState } from "react";
import { config } from "@/config";
import { CURRENCIES } from "@/lib/currency";
import { formatApprox, formatEntry, formatMoney, parseAmount } from "@/lib/format";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { Keypad } from "../ui/Keypad";
import { SheetHeader } from "../ui/SheetHeader";
import { Spinner } from "../ui/Spinner";

type Step = "name" | "price" | "deposit" | "creating" | "failed";

const SUGGESTIONS = ["Netflix", "Spotify", "Data bundle", "Cloud storage"];

/**
 * Starting a pot: what it is for, what one use costs, and what you put in.
 *
 * The price is the thing to be careful about, because it is fixed for good --
 * members join under it, and changing it later would reprice money they have
 * already put in. A new price is a new pot, and the screen says so before it
 * is set rather than after.
 */
export function CreatePot({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: bigint) => void;
}) {
  const { currency, balance, createPot } = useKolo();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [priceEntry, setPriceEntry] = useState("");
  const [depositEntry, setDepositEntry] = useState("");

  const price = parseAmount(priceEntry, currency) ?? 0n;
  const deposit = parseAmount(depositEntry, currency) ?? 0n;
  const available = balance ?? 0n;
  const tooMuch = deposit > available;
  const trimmed = name.trim();

  async function confirm() {
    setStep("creating");
    try {
      const id = await createPot({
        name: trimmed,
        price,
        deposit,
        payee: config.contracts.demoPayee,
      });
      onCreated(id);
    } catch (error) {
      console.error("[kolo] could not start the pot", error);
      setStep("failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col px-5 pb-8 pt-6">
        {step === "name" && (
          <>
            <SheetHeader title="New pot" onClose={onClose} />

            <div className="mt-8">
              <h2 className="text-[26px] font-bold leading-tight tracking-tight">
                What are you sharing?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Everyone puts in their own money and pays only for what they use themselves.
              </p>
            </div>

            <div className="mt-7">
              <input
                value={name}
                onChange={(event) => {
                  const next = event.target.value;
                  // The contract's cap is in bytes, so counting characters
                  // would let a longer name through and revert.
                  if (new TextEncoder().encode(next).length <= config.pots.maxNameBytes) {
                    setName(next);
                  }
                }}
                autoFocus
                placeholder="Netflix"
                aria-label="What the pot is for"
                className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-[19px]
                           font-semibold text-text outline-none placeholder:font-normal
                           placeholder:text-muted/60 focus:border-muted"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    aria-pressed={trimmed === suggestion}
                    className={`h-9 rounded-pill border px-3.5 text-[14px] transition active:scale-95
                                ${
                                  trimmed === suggestion
                                    ? "border-accent bg-accent/10 text-text"
                                    : "border-line bg-raised text-muted"
                                }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1" />
            <Button full className="mt-6" disabled={trimmed === ""} onClick={() => setStep("price")}>
              Continue
            </Button>
          </>
        )}

        {step === "price" && (
          <>
            <SheetHeader title={trimmed} onBack={() => setStep("name")} onClose={onClose} />
            <div className="flex flex-1 flex-col items-center justify-center">
              <p className="text-[15px] text-muted">One use costs</p>
              <p
                className={`tabular mt-2 text-[60px] font-bold leading-none tracking-tight ${
                  priceEntry === "" ? "text-muted/40" : "text-text"
                }`}
              >
                {formatEntry(priceEntry, currency)}
              </p>
              <p className="mt-3 max-w-[18rem] text-center text-[14px] leading-relaxed text-muted">
                Charged to whoever uses it, out of their own share. Fixed once the pot is open —
                a different price means a new pot.
              </p>
            </div>
            <Keypad
              value={priceEntry}
              onChange={setPriceEntry}
              decimals={CURRENCIES[currency].decimals}
            />
            <Button
              full
              className="mt-4"
              disabled={price === 0n}
              onClick={() => setStep("deposit")}
            >
              Continue
            </Button>
          </>
        )}

        {step === "deposit" && (
          <>
            <SheetHeader title="What you put in" onBack={() => setStep("price")} onClose={onClose} />
            <div className="flex flex-1 flex-col items-center justify-center">
              <p
                className={`tabular text-[56px] font-bold leading-none tracking-tight ${
                  depositEntry === "" ? "text-muted/40" : tooMuch ? "text-danger" : "text-text"
                }`}
              >
                {formatEntry(depositEntry, currency)}
              </p>
              <p className={`mt-3 text-[15px] ${tooMuch ? "text-danger" : "text-muted"}`}>
                {tooMuch
                  ? "More than your balance"
                  : `${formatMoney(available, currency)} in your balance`}
              </p>
              {price > 0n && deposit > 0n && !tooMuch && (
                <p className="mt-3 max-w-[18rem] text-center text-[14px] leading-relaxed text-muted">
                  That covers {Number(deposit / price)} use
                  {Number(deposit / price) === 1 ? "" : "s"} at {formatMoney(price, currency)} each.
                  Whatever you don&apos;t use stays available to withdraw.
                </p>
              )}
            </div>
            <Keypad
              value={depositEntry}
              onChange={setDepositEntry}
              decimals={CURRENCIES[currency].decimals}
            />
            <Button full className="mt-4" disabled={tooMuch} onClick={confirm}>
              {deposit === 0n
                ? "Start pot without putting in"
                : `Start pot — ${formatMoney(deposit, currency)}`}
            </Button>
            <p className="mt-2.5 text-center text-[13px] text-muted">
              {formatApprox(deposit, currency) ?? "No fee"}
            </p>
          </>
        )}

        {step === "creating" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <Spinner className="h-10 w-10 text-accent" />
            <p className="text-[18px] font-medium text-muted">Starting your pot…</p>
          </div>
        )}

        {step === "failed" && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[19px] font-semibold">Something went wrong — try again</p>
              <p className="text-[15px] text-muted">Your money hasn&apos;t moved.</p>
            </div>
            <div className="space-y-3">
              <Button full onClick={confirm}>
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
