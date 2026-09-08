"use client";

import { useState } from "react";
import { linkStateOf, type ActivityItem } from "@/lib/activity";
import { formatApprox, formatMoney } from "@/lib/format";
import { useCancelLink } from "@/hooks/useClaimLink";
import { useKolo } from "../kolo-provider";
import { Button } from "../ui/Button";
import { LinkIcon, Warning } from "../ui/Icons";
import { SheetHeader } from "../ui/SheetHeader";

/**
 * Taking back a link you sent.
 *
 * The same contract call covers cancelling a live link and sweeping up one
 * nobody collected, so the copy is what changes, not the operation.
 */
export function CancelLink({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const { currency, refreshBalance, refreshActivity } = useKolo();
  const { cancel } = useCancelLink();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = linkStateOf(item) === "expired";

  async function onConfirm() {
    if (!item.secretHash) return;
    setBusy(true);
    setError(null);
    try {
      await cancel(item.secretHash);
      await Promise.all([refreshBalance(), refreshActivity()]);
      onClose();
    } catch (cause) {
      console.error("[kolo] cancel link failed", cause);
      // Someone may have collected it between the feed refreshing and this tap.
      setError(
        String(cause).includes("LinkNotFound")
          ? "Someone already collected this one"
          : "Something went wrong — try again"
      );
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-sheet-up bg-ink">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col px-5 pb-8 pt-6">
        <SheetHeader title={expired ? "Expired link" : "Take it back"} onClose={onClose} />

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-raised text-muted">
            <LinkIcon className="h-8 w-8" />
          </span>

          <p className="tabular mt-7 text-[44px] font-bold leading-none tracking-tight">
            {formatMoney(item.amount, currency)}
          </p>
          {formatApprox(item.amount, currency) && (
            <p className="tabular mt-2 text-[15px] text-muted">
              {formatApprox(item.amount, currency)}
            </p>
          )}

          <p className="mt-6 max-w-[19rem] text-[16px] leading-relaxed text-muted">
            {expired
              ? "Nobody collected this one in time. Move it back into your balance."
              : "This will move the money back into your balance, and the link will stop working."}
          </p>
        </div>

        {error && (
          <p className="mb-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[15px] text-danger">
            <Warning className="h-5 w-5 shrink-0" />
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Button full loading={busy} onClick={onConfirm}>
            Move {formatMoney(item.amount, currency)} back
          </Button>
          <Button full variant="ghost" onClick={onClose}>
            Leave it
          </Button>
        </div>
      </div>
    </div>
  );
}
