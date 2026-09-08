"use client";

import type { ActivityItem } from "@/lib/activity";
import { formatMoney, formatWhen } from "@/lib/format";
import { useKolo } from "./kolo-provider";
import { Avatar } from "./ui/Avatar";
import { ArrowDownLeft, ArrowUpRight } from "./ui/Icons";

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return <EmptyState />;

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { currency } = useKolo();
  const incoming = item.direction === "in";
  const name = item.counterpartyHandle ? `@${item.counterpartyHandle}` : "Someone";

  const subtitle = item.status === "pending" ? "Sending…" : item.memo || (incoming ? "Received" : "Sent");

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition ${
        item.status === "pending" ? "opacity-70" : ""
      }`}
    >
      <div className="relative">
        <Avatar handle={item.counterpartyHandle || "?"} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center
                      rounded-full border-2 border-ink ${incoming ? "bg-inbound" : "bg-raised"}`}
        >
          {incoming ? (
            <ArrowDownLeft className="h-3 w-3 text-ink" />
          ) : (
            <ArrowUpRight className="h-3 w-3 text-muted" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-text">{name}</p>
        <p className="truncate text-[14px] text-muted">{subtitle}</p>
      </div>

      <div className="text-right">
        <p
          className={`tabular text-[16px] font-semibold ${incoming ? "text-inbound" : "text-text"}`}
        >
          {incoming ? "+" : "−"}
          {formatMoney(item.amount, currency)}
        </p>
        <p className="text-[13px] text-muted">
          {item.status === "pending" ? "Now" : formatWhen(item.timestamp)}
        </p>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[16px] font-semibold text-text">Nothing here yet</p>
      <p className="mx-auto mt-1.5 max-w-[15rem] text-[14px] leading-relaxed text-muted">
        Add some demo funds, then send a little to a friend&apos;s @handle.
      </p>
    </div>
  );
}
