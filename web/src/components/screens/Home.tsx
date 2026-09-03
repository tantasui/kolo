"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";
import { ActivityList } from "../ActivityList";
import { useKolo } from "../kolo-provider";
import { SendSheet } from "../send/SendSheet";
import { Avatar } from "../ui/Avatar";
import { ArrowUpRight, Check, Copy, Plus, Warning } from "../ui/Icons";
import { Spinner } from "../ui/Spinner";

export function Home() {
  const { handle, balance, activity, addMoney } = useKolo();

  const [sendOpen, setSendOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onAddMoney() {
    setAdding(true);
    setNotice(null);
    try {
      await addMoney();
    } catch (error) {
      console.error("[kolo] add money failed", error);
      setNotice(
        String(error).includes("FaucetCooldown")
          ? "You've already added money this hour"
          : "Something went wrong — try again"
      );
    } finally {
      setAdding(false);
    }
  }

  async function onCopy() {
    if (!handle) return;
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("[kolo] copy failed", error);
    }
  }

  return (
    <>
      <div className="flex min-h-[100dvh] flex-col px-5 pb-10 pt-6">
        <header className="flex items-center gap-3">
          <Avatar handle={handle ?? "?"} size={40} />
          <button
            type="button"
            onClick={onCopy}
            className="group flex items-center gap-1.5 rounded-pill py-1 text-left"
            aria-label={`Copy your handle, @${handle ?? ""}`}
          >
            <span className="text-[17px] font-semibold">@{handle}</span>
            {copied ? (
              <Check className="h-4 w-4 text-accent" />
            ) : (
              <Copy className="h-4 w-4 text-muted transition group-hover:text-text" />
            )}
          </button>
        </header>

        <section className="mt-10">
          <p className="text-[14px] font-medium text-muted">Balance</p>
          <p className="tabular mt-1 text-[52px] font-bold leading-none tracking-tight">
            {balance === null ? (
              <span className="inline-block h-[52px] w-48 animate-pulse rounded-2xl bg-raised align-middle" />
            ) : (
              formatUsd(balance)
            )}
          </p>
        </section>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setSendOpen(true)}
            disabled={balance === null}
            className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-pill bg-accent
                       text-[17px] font-semibold text-ink transition active:scale-[0.98]
                       disabled:opacity-40"
          >
            <ArrowUpRight className="h-5 w-5" />
            Send
          </button>
          <button
            type="button"
            onClick={onAddMoney}
            disabled={adding}
            className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-pill border
                       border-line bg-raised text-[17px] font-semibold text-text transition
                       active:scale-[0.98] disabled:opacity-60"
          >
            {adding ? <Spinner /> : <Plus className="h-5 w-5" />}
            {adding ? "Adding…" : "Add money"}
          </button>
        </div>

        {notice && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
            <Warning className="h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}

        <section className="mt-10 flex-1">
          <h2 className="mb-2 px-2 text-[14px] font-medium text-muted">Activity</h2>
          <ActivityList items={activity} />
        </section>
      </div>

      {sendOpen && <SendSheet onClose={() => setSendOpen(false)} />}
    </>
  );
}
