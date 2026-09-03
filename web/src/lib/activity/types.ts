import type { Address, Hex } from "viem";

export type ActivityDirection = "in" | "out";

/**
 * "pending" items are written optimistically the moment a send is submitted,
 * so the feed updates instantly; they are replaced when the matching log
 * is observed on chain.
 */
export type ActivityStatus = "pending" | "confirmed";

export interface ActivityItem {
  /** Stable dedupe key: `${txHash}:${logIndex}`, or `local:${uuid}` while pending. */
  id: string;
  direction: ActivityDirection;
  /** The other party's handle. Falls back to "" for unregistered senders. */
  counterpartyHandle: string;
  counterpartyAddress: Address;
  /** Raw token units; format with formatUsd. */
  amount: bigint;
  memo: string;
  status: ActivityStatus;
  /** Unix seconds, or null when not yet known. */
  timestamp: number | null;
  blockNumber: bigint | null;
  txHash: Hex | null;
}

export interface ActivityQuery {
  account: Address;
  fromBlock: bigint;
  toBlock: bigint;
}

/**
 * Where activity comes from. The app talks only to this interface, so the
 * RPC implementation can be swapped for an Envio HyperIndex source without
 * touching a single UI component.
 */
export interface ActivitySource {
  readonly name: string;
  /** Largest span a single `fetch` may cover. Callers page by this. */
  readonly maxRange: bigint;
  /** Latest block this source can answer for. */
  getHead(): Promise<bigint>;
  fetch(query: ActivityQuery): Promise<ActivityItem[]>;
}

/** Newest first, with pending items pinned to the top. */
export function sortActivity(items: ActivityItem[]): ActivityItem[] {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    const ab = a.blockNumber ?? 0n;
    const bb = b.blockNumber ?? 0n;
    if (ab !== bb) return bb > ab ? 1 : -1;
    return b.id.localeCompare(a.id);
  });
}
