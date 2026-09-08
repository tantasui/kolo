import type { Address, Hex } from "viem";

export type ActivityDirection = "in" | "out";

/** A payment went straight to a handle; a link parked money behind a secret. */
export type ActivityKind = "payment" | "link";

/**
 * Where a claim link stands, from the sender's side.
 *
 * `pending` and `expired` are the same on-chain row -- the money is still
 * parked either way -- separated only by the clock, so `linkStateOf` derives
 * expiry at render time rather than waiting for an event that never comes.
 */
export type LinkState = "pending" | "claimed" | "expired" | "cancelled";

/**
 * "pending" items are written optimistically the moment a send is submitted,
 * so the feed updates instantly; they are replaced when the matching log
 * is observed on chain.
 */
export type ActivityStatus = "pending" | "confirmed";

export interface ActivityItem {
  /**
   * Stable dedupe key. Payments use `${txHash}:${logIndex}`; links use
   * `link:${secretHash}` so every event about one link lands on one row.
   * Optimistic rows use `local:${uuid}`.
   */
  id: string;
  kind: ActivityKind;
  direction: ActivityDirection;
  /** The other party's handle. Falls back to "" for unregistered senders. */
  counterpartyHandle: string;
  counterpartyAddress: Address;
  /** Raw token units; format with formatMoney. */
  amount: bigint;
  memo: string;
  status: ActivityStatus;
  /** Unix seconds, or null when not yet known. */
  timestamp: number | null;
  blockNumber: bigint | null;
  txHash: Hex | null;

  /** Links only. */
  secretHash?: Hex;
  linkState?: LinkState;
  /** Unix seconds after which the link can no longer be claimed. */
  expiresAt?: number;
}

/**
 * A link's state right now. Stored state is what events have told us; a link
 * still `pending` past its expiry is shown as expired without any event.
 */
export function linkStateOf(item: ActivityItem, now = Date.now() / 1000): LinkState | null {
  if (item.kind !== "link") return null;
  const state = item.linkState ?? "pending";
  if (state === "pending" && item.expiresAt !== undefined && now >= item.expiresAt) {
    return "expired";
  }
  return state;
}

/** Only a link whose money is still parked can be cancelled by its sender. */
export function isRecoverable(item: ActivityItem, now = Date.now() / 1000): boolean {
  const state = linkStateOf(item, now);
  return state === "pending" || state === "expired";
}

export interface ActivityQuery {
  account: Address;
  fromBlock: bigint;
  toBlock: bigint;
  /**
   * Links we already know about. Claims and reclaims are indexed by secret
   * hash rather than by sender, so the source needs this to tell "my link was
   * claimed" from "somebody else's link was claimed" without inventing rows.
   */
  knownLinkHashes?: readonly Hex[];
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
