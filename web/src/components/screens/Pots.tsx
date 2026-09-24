"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { Pot } from "@/lib/pots";
import { CreatePot } from "../pots/CreatePot";
import { PotDetail } from "../pots/PotDetail";
import { useKolo } from "../kolo-provider";
import { Plus } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";

/**
 * Every pot this account has a share in.
 *
 * A pot is not a shared purse: each member's money stays their own, and the
 * list leads with the price everybody is paying rather than with a total,
 * because the total is nobody's.
 */
export function Pots() {
  const { pots, potsLoaded, currency } = useKolo();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<bigint | null>(null);

  return (
    <>
      <div className="flex min-h-[100dvh] flex-col px-5 pb-28 pt-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-bold tracking-tight">Pots</h1>
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="New pot"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line
                       bg-raised text-text transition active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {!potsLoaded ? (
          <p className="mt-10 flex items-center gap-3 text-[15px] text-muted">
            <Spinner className="h-5 w-5" /> Opening your pots…
          </p>
        ) : pots.length === 0 ? (
          <Empty onStart={() => setCreating(true)} />
        ) : (
          <ul className="mt-6 space-y-3">
            {pots.map((pot) => (
              <li key={pot.id.toString()}>
                <button
                  type="button"
                  onClick={() => setOpenId(pot.id)}
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-4 text-left
                             transition active:scale-[0.99]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[17px] font-semibold text-text">
                      {pot.name || "Pot"}
                    </span>
                    <span className="tabular shrink-0 text-[15px] text-muted">
                      {formatMoney(pot.price, currency)} each
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {pot.memberCount} {pot.memberCount === 1 ? "person" : "people"}
                    {pot.status === "closed" && " · closed"}
                  </p>
                  <div className="mt-3">
                    <Chip pot={pot} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <CreatePot
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(id);
          }}
        />
      )}
      {openId !== null && <PotDetail potId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Chip({ pot }: { pot: Pot }) {
  const { currency } = useKolo();

  if (pot.status === "closed") {
    return (
      <Pill>Closed — your share is still yours to withdraw</Pill>
    );
  }
  return <Pill>{formatMoney(pot.used, currency)} used by everyone so far</Pill>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-pill bg-raised px-3 py-1.5 text-[13px] font-medium text-muted">
      {children}
    </span>
  );
}

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-[22px] font-bold tracking-tight">Share one subscription</p>
      <p className="mx-auto mt-2.5 max-w-[17rem] text-[15px] leading-relaxed text-muted">
        Everyone puts in their own money and pays only for what they use themselves. Whatever you
        don&apos;t use stays yours, and you can take it back whenever you like.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-7 flex h-[54px] items-center justify-center gap-2 rounded-pill bg-accent px-7
                   text-[17px] font-semibold text-ink transition active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
        Start a pot
      </button>
    </div>
  );
}
