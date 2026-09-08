"use client";

import { useState } from "react";
import { isRecoverable, linkStateOf, type ActivityItem, type LinkState } from "@/lib/activity";
import { formatMoney, formatWhen } from "@/lib/format";
import { useKolo } from "./kolo-provider";
import { CancelLink } from "./send/CancelLink";
import { Avatar } from "./ui/Avatar";
import { ArrowDownLeft, ArrowUpRight, Check, Close, LinkIcon } from "./ui/Icons";

export function ActivityList({ items }: { items: ActivityItem[] }) {
  const [cancelling, setCancelling] = useState<ActivityItem | null>(null);

  if (items.length === 0) return <EmptyState />;

  return (
    <>
      <ul className="space-y-1">
        {items.map((item) =>
          item.kind === "link" ? (
            <LinkRow key={item.id} item={item} onCancel={() => setCancelling(item)} />
          ) : (
            <PaymentRow key={item.id} item={item} />
          )
        )}
      </ul>

      {cancelling && (
        <CancelLink item={cancelling} onClose={() => setCancelling(null)} />
      )}
    </>
  );
}

/* ---------- payments ---------- */

function PaymentRow({ item }: { item: ActivityItem }) {
  const { currency } = useKolo();
  const incoming = item.direction === "in";
  const name = item.counterpartyHandle ? `@${item.counterpartyHandle}` : "Someone";

  const subtitle =
    item.status === "pending" ? "Sending…" : item.memo || (incoming ? "Received" : "Sent");

  return (
    <Row
      badge={
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
      }
      title={name}
      subtitle={subtitle}
      amount={
        <span className={`tabular text-[16px] font-semibold ${incoming ? "text-inbound" : "text-text"}`}>
          {incoming ? "+" : "−"}&#8202;{formatMoney(item.amount, currency)}
        </span>
      }
      when={item.status === "pending" ? "Now" : formatWhen(item.timestamp)}
      dim={item.status === "pending"}
    />
  );
}

/* ---------- links ---------- */

const LINK_COPY: Record<LinkState, { label: string; tone: string }> = {
  pending: { label: "Waiting to be collected", tone: "text-muted" },
  claimed: { label: "Collected", tone: "text-inbound" },
  expired: { label: "Expired — tap to get it back", tone: "text-danger" },
  cancelled: { label: "You took this back", tone: "text-muted" },
};

function LinkRow({ item, onCancel }: { item: ActivityItem; onCancel: () => void }) {
  const { currency } = useKolo();
  const state = linkStateOf(item) ?? "pending";
  const { label, tone } = LINK_COPY[state];
  const recoverable = isRecoverable(item);

  // Cancelled money came back, so it never left; claimed money did.
  const spent = state === "claimed" || state === "pending" || state === "expired";

  const body = (
    <Row
      badge={
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full
                      ${state === "claimed" ? "bg-inbound/15 text-inbound" : "bg-raised text-muted"}`}
        >
          {state === "claimed" ? (
            <Check className="h-5 w-5" />
          ) : state === "cancelled" ? (
            <Close className="h-5 w-5" />
          ) : (
            <LinkIcon className="h-5 w-5" />
          )}
        </span>
      }
      // The memo takes the title line the way a handle does on a payment, so
      // the status below it is never squeezed out -- "tap to get it back" is
      // the only cue that an expired link is recoverable, and truncating it
      // hides the affordance entirely.
      title={item.memo || "Sent as a link"}
      subtitle={label}
      subtitleTone={tone}
      amount={
        <span
          className={`tabular text-[16px] font-semibold ${
            state === "cancelled" ? "text-muted line-through" : "text-text"
          }`}
        >
          {spent ? "−" : ""}
          &#8202;
          {formatMoney(item.amount, currency)}
        </span>
      }
      when={formatWhen(item.timestamp)}
    />
  );

  if (!recoverable) return body;

  return (
    <button
      type="button"
      onClick={onCancel}
      aria-label={`Take back the link for ${formatMoney(item.amount, currency)}`}
      className="w-full rounded-2xl text-left transition active:scale-[0.99]"
    >
      {body}
    </button>
  );
}

/* ---------- shared ---------- */

function Row({
  badge,
  title,
  subtitle,
  subtitleTone = "text-muted",
  amount,
  when,
  dim = false,
}: {
  badge: React.ReactNode;
  title: string;
  subtitle: string;
  subtitleTone?: string;
  amount: React.ReactNode;
  when: string;
  dim?: boolean;
}) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition ${dim ? "opacity-70" : ""}`}>
      {badge}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold text-text">{title}</p>
        <p className={`truncate text-[14px] ${subtitleTone}`}>{subtitle}</p>
      </div>

      <div className="text-right">
        <p>{amount}</p>
        <p className="text-[13px] text-muted">{when}</p>
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
