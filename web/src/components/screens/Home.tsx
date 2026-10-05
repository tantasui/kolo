"use client";

import { useEffect, useState } from "react";
import { formatApprox, formatMoney } from "@/lib/format";
import { ActivityList } from "../ActivityList";
import { DueBanner } from "../DueBanner";
import { CircleDetail } from "../circles/CircleDetail";
import { useKolo } from "../kolo-provider";
import { SendSheet } from "../send/SendSheet";
import { Settings } from "./Settings";
import { CurrencySwitch } from "../ui/CurrencySwitch";
import { Avatar } from "../ui/Avatar";
import { ArrowUpRight, Check, Copy, Gear, Mic, Plus, Warning } from "../ui/Icons";
import { speechSupported } from "@/lib/speech";
import { Spinner } from "../ui/Spinner";

export function Home() {
  const { handle, balance, activity, addMoney, currency, circles } = useKolo();

  const [sendOpen, setSendOpen] = useState<false | "tap" | "voice">(false);
  const [canListen, setCanListen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openCircle, setOpenCircle] = useState<(typeof circles)[number] | null>(null);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // A brand-new user has nothing to send, so lead with adding money instead.
  const emptyPurse = balance === 0n;

  // Recognition only exists in the browser, so this is decided after mount.
  useEffect(() => setCanListen(speechSupported()), []);

  async function onAddMoney() {
    setAdding(true);
    setNotice(null);
    try {
      await addMoney();
    } catch (error) {
      console.error("[kolo] add money failed", error);
      const reason = String(error);
      setNotice(
        reason.includes("CooldownActive")
          ? "You've already added funds this hour"
          : reason.includes("FaucetEmpty")
            ? "Demo funds have run out for now"
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
      <div className="flex min-h-[100dvh] flex-col px-5 pb-28 pt-6">
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

          <div className="flex-1" />

          {canListen && (
            <button
              type="button"
              onClick={() => setSendOpen("voice")}
              disabled={balance === null || emptyPurse}
              aria-label="Send by voice"
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition
                         active:scale-95 disabled:opacity-40"
            >
              <Mic className="h-[22px] w-[22px]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted transition active:scale-95"
          >
            <Gear className="h-[22px] w-[22px]" />
          </button>
        </header>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-medium text-muted">Balance</p>
            <CurrencySwitch />
          </div>
          <p className="tabular mt-1 text-[52px] font-bold leading-none tracking-tight">
            {balance === null ? (
              <span className="inline-block h-[52px] w-48 animate-pulse rounded-2xl bg-raised align-middle" />
            ) : (
              formatMoney(balance, currency)
            )}
          </p>
          {balance !== null && formatApprox(balance, currency) && (
            <p className="tabular mt-1.5 text-[15px] text-muted">
              {formatApprox(balance, currency)}
            </p>
          )}
        </section>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setSendOpen("tap")}
            disabled={balance === null || emptyPurse}
            className={`flex h-[54px] flex-1 items-center justify-center gap-2 rounded-pill
                        text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-40
                        ${emptyPurse ? "border border-line bg-raised text-text" : "bg-accent text-ink"}`}
          >
            <ArrowUpRight className="h-5 w-5" />
            Send
          </button>
          <button
            type="button"
            onClick={onAddMoney}
            disabled={adding}
            className={`flex h-[54px] flex-1 items-center justify-center gap-2 rounded-pill
                        text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-60
                        ${emptyPurse ? "bg-accent text-ink" : "border border-line bg-raised text-text"}`}
          >
            {adding ? <Spinner /> : <Plus className="h-5 w-5" />}
            {adding ? "Adding…" : "Add demo funds"}
          </button>
        </div>

        {notice && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
            <Warning className="h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}

        <DueBanner circles={circles} onOpen={setOpenCircle} />

        <section className="mt-10 flex-1">
          <h2 className="mb-2 px-2 text-[14px] font-medium text-muted">Activity</h2>
          <ActivityList items={activity} />
        </section>
      </div>

      {sendOpen && <SendSheet voice={sendOpen === "voice"} onClose={() => setSendOpen(false)} />}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      {openCircle && <CircleDetail circle={openCircle} onClose={() => setOpenCircle(null)} />}
    </>
  );
}
