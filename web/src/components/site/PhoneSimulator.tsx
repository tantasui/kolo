"use client";

import { useState } from "react";
import { config, getRate } from "@/config";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { formatMoney, initials, normaliseHandle } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Circle, Plus } from "../ui/Icons";
import { Battery, Signal, SyncAlt, Verified, Wifi } from "./Icons";

/**
 * The app, in a phone frame, actually working.
 *
 * It is a simulator rather than the app: no chain, no sign-in, numbers that
 * start where the faucet starts them. But every figure in it is produced by
 * `formatMoney` and `getRate` -- the same code Home runs -- so the dollars and
 * the naira on this page can never drift from the dollars and the naira in the
 * product, and the balance always equals the rows above it.
 *
 * Four things work, because they are the four things the app does in one tap:
 * flip the currency, add funds, send, and pay a handle you type.
 */

const QUICK_PAY = 10_000_000n;
const TOP_UP = 50_000_000n;

type Row = {
  id: number;
  kind: "in" | "out" | "funds" | "circle";
  title: string;
  note: string;
  when: string;
  amount: bigint;
  avatar?: string;
};

const SEED: Row[] = [
  {
    id: 1,
    kind: "in",
    title: "@chidi",
    note: "Lunch 🍜",
    when: "2m ago",
    amount: 45_000_000n,
    avatar: "chidi",
  },
  {
    id: 2,
    kind: "out",
    title: "@amara",
    note: "Design pass",
    when: "14m ago",
    amount: 20_000_000n,
    avatar: "amara",
  },
  {
    id: 3,
    kind: "circle",
    title: "Rent circle",
    note: "Round 3 paid out",
    when: "1h ago",
    amount: 250_000_000n,
  },
];

/** 100 − 20 + 45 + 250. The frame's arithmetic has to add up. */
const SEED_BALANCE = 375_000_000n;

export function PhoneSimulator() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [balance, setBalance] = useState(SEED_BALANCE);
  const [rows, setRows] = useState<Row[]>(SEED);
  const [recipient, setRecipient] = useState("chidi");
  const [nextId, setNextId] = useState(100);

  const other: Currency = currency === "USD" ? "NGN" : "USD";

  function prepend(row: Omit<Row, "id">) {
    setRows((current) => [{ ...row, id: nextId }, ...current].slice(0, 6));
    setNextId((value) => value + 1);
  }

  function addFunds() {
    setBalance((value) => value + TOP_UP);
    prepend({
      kind: "funds",
      title: "Added funds",
      note: "Just now · no fee",
      when: "now",
      amount: TOP_UP,
    });
  }

  function send(to: string) {
    if (balance < QUICK_PAY) return;
    const handle = normaliseHandle(to) || "someone";
    setBalance((value) => value - QUICK_PAY);
    prepend({
      kind: "out",
      title: `@${handle}`,
      note: "Just now · no fee",
      when: "now",
      amount: QUICK_PAY,
      avatar: handle,
    });
  }

  const broke = balance < QUICK_PAY;

  return (
    <figure className="m-0 flex justify-center lg:justify-end">
      <div
        className="relative w-full max-w-[390px] rounded-[2.75rem] border-4 border-line bg-ink p-3
                   shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)]"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[2.1rem] border border-line bg-surface p-4">
          {/* status bar */}
          <div className="flex items-center justify-between px-2 pb-3 pt-1">
            <span className="font-mono text-[11px] font-medium text-muted">
              9:41
            </span>
            <span className="flex h-4 w-24 items-center justify-center rounded-pill bg-raised">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" />
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <Battery className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* who you are, and how you want money shown */}
          <div className="flex items-center justify-between border-b border-line px-1 pb-3 pt-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-raised font-mono text-[11px] font-semibold text-accent">
                {initials("sola")}
              </span>
              <div>
                <p className="flex items-center gap-1 text-[14px] font-semibold">
                  @sola
                  <Verified className="h-3.5 w-3.5 text-inbound" />
                </p>
                <p className="font-mono text-[10px] text-muted">
                  position 1 of 4 · Rent circle
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrency(other)}
              aria-label={`Show balances in ${CURRENCIES[other].label}`}
              className="flex items-center gap-1 rounded-pill border border-line bg-raised px-2.5 py-1
                         font-mono text-[11px] font-bold text-accent transition
                         hover:border-muted active:scale-95"
            >
              {currency}
              <SyncAlt className="h-3.5 w-3.5 text-muted" />
            </button>
          </div>

          {/* balance */}
          <div className="flex flex-col items-center px-2 py-5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Balance
            </p>
            <p className="tabular mt-1 text-[38px] font-bold leading-tight tracking-tight">
              {formatMoney(balance, currency)}
            </p>
            <p className="tabular mt-0.5 font-mono text-[13px] text-muted">
              ≈ {formatMoney(balance, other)}
            </p>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill bg-raised px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-inbound" />
              <span className="font-mono text-[10px] text-muted">
                $1 = ₦{getRate().toLocaleString("en-US")} · fixed rate
              </span>
            </span>
          </div>

          {/* the two things on Home */}
          <div className="mb-4 grid grid-cols-2 gap-2.5 px-1">
            <button
              type="button"
              onClick={() => send(recipient)}
              disabled={broke}
              className="flex items-center justify-center gap-1 rounded-xl2 bg-accent py-2.5 text-[14px]
                         font-semibold text-ink transition hover:bg-accent-dim active:scale-95
                         disabled:opacity-40"
            >
              <ArrowUpRight className="h-4 w-4" />
              Send
            </button>
            <button
              type="button"
              onClick={addFunds}
              className="flex items-center justify-center gap-1 rounded-xl2 border border-line bg-raised
                         py-2.5 text-[14px] font-medium transition hover:bg-line active:scale-95"
            >
              <Plus className="h-4 w-4 text-accent" />
              Add funds
            </button>
          </div>

          {/* quick pay */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(recipient);
            }}
            className="mb-3 rounded-xl2 border border-line bg-raised p-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-muted">
              <span className="uppercase tracking-[0.14em]">
                Send to a handle
              </span>
              <span className="text-inbound">No fee</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="font-mono text-[13px] font-bold text-accent"
              >
                @
              </span>
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="recipient handle"
                aria-label="Recipient handle"
                maxLength={config.handle.maxLength}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted/50"
              />
              <button
                type="submit"
                disabled={broke}
                className="shrink-0 rounded-lg border border-line bg-surface px-2 py-1 font-mono
                           text-[10px] text-muted transition hover:text-accent active:scale-95
                           disabled:opacity-40"
              >
                Pay {formatMoney(QUICK_PAY, currency)}
              </button>
            </div>
          </form>

          {/* activity */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span>Activity</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-inbound" />
                Live
              </span>
            </div>

            <ul className="space-y-2 overflow-y-auto pr-0.5 no-scrollbar">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex animate-rise-in items-center justify-between gap-2 rounded-xl2
                             border border-line bg-raised p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge row={row} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {row.title}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted">
                        {row.note}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`tabular font-mono text-[12px] font-semibold ${
                        row.kind === "out" ? "text-text" : "text-inbound"
                      }`}
                    >
                      {row.kind === "out" ? "−" : "+"}&#8202;
                      {formatMoney(row.amount, currency)}
                    </p>
                    <p className="font-mono text-[9px] text-muted">
                      {row.when}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center pt-3">
            <span className="h-1 w-28 rounded-pill bg-line" />
          </div>
        </div>
      </div>
    </figure>
  );
}

function Badge({ row }: { row: Row }) {
  if (row.kind === "funds") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
        <Plus className="h-3.5 w-3.5 text-muted" />
      </span>
    );
  }

  if (row.kind === "circle") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Circle className="h-3.5 w-3.5 text-accent" />
      </span>
    );
  }

  return (
    <span className="relative shrink-0">
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
          row.kind === "in"
            ? "bg-inbound/15 text-inbound"
            : "bg-surface text-text"
        }`}
      >
        {initials(row.avatar ?? row.title)}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center
                    rounded-full border-2 border-raised ${row.kind === "in" ? "bg-inbound" : "bg-line"}`}
      >
        {row.kind === "in" ? (
          <ArrowDownLeft className="h-2 w-2 text-ink" />
        ) : (
          <ArrowUpRight className="h-2 w-2 text-muted" />
        )}
      </span>
    </span>
  );
}
