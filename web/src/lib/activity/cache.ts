import type { Address, Hex } from "viem";
import type { ActivityItem } from "./types";

/**
 * Because the RPC only serves a 100-block window, the feed's memory lives
 * on the device: what we have already seen is persisted and merged with each
 * new sweep. An indexer would make this cache an optimisation rather than a
 * requirement.
 */
export interface ActivityCache {
  items: ActivityItem[];
  /** Highest block already swept, so we resume rather than rescan. */
  lastSyncedBlock: bigint | null;
}

const VERSION = 1;

function keyFor(account: Address): string {
  return `kolo:activity:v${VERSION}:${account.toLowerCase()}`;
}

interface StoredItem {
  id: string;
  kind?: "payment" | "link";
  direction: "in" | "out";
  counterpartyHandle: string;
  counterpartyAddress: string;
  amount: string;
  memo: string;
  status: "pending" | "confirmed";
  timestamp: number | null;
  blockNumber: string | null;
  txHash: string | null;
  secretHash?: string;
  linkState?: "pending" | "claimed" | "expired" | "cancelled";
  expiresAt?: number;
}

export function loadCachedActivity(account: Address): ActivityCache {
  const empty: ActivityCache = { items: [], lastSyncedBlock: null };
  if (typeof window === "undefined") return empty;

  try {
    const raw = window.localStorage.getItem(keyFor(account));
    if (!raw) return empty;

    const parsed = JSON.parse(raw) as { items?: StoredItem[]; lastSyncedBlock?: string | null };

    return {
      items: (parsed.items ?? []).map((item) => ({
        id: item.id,
        // Rows cached before links existed are payments.
        kind: item.kind ?? "payment",
        direction: item.direction,
        counterpartyHandle: item.counterpartyHandle,
        counterpartyAddress: item.counterpartyAddress as Address,
        amount: BigInt(item.amount),
        memo: item.memo,
        status: item.status,
        timestamp: item.timestamp,
        blockNumber: item.blockNumber === null ? null : BigInt(item.blockNumber),
        txHash: (item.txHash as Hex | null) ?? null,
        secretHash: item.secretHash as Hex | undefined,
        linkState: item.linkState,
        expiresAt: item.expiresAt,
      })),
      lastSyncedBlock:
        parsed.lastSyncedBlock === null || parsed.lastSyncedBlock === undefined
          ? null
          : BigInt(parsed.lastSyncedBlock),
    };
  } catch (error) {
    console.error("[kolo] could not read cached activity", error);
    return empty;
  }
}

export function saveCachedActivity(account: Address, cache: ActivityCache): void {
  if (typeof window === "undefined") return;

  try {
    const payload = {
      // Pending items are in-memory only: on the next load the confirmed log
      // is picked up by the backfill from lastSyncedBlock, so persisting the
      // optimistic copy would only risk a duplicate row.
      items: cache.items
        .filter((item) => item.status === "confirmed")
        .map((item): StoredItem => ({
          id: item.id,
          kind: item.kind,
          direction: item.direction,
          counterpartyHandle: item.counterpartyHandle,
          counterpartyAddress: item.counterpartyAddress,
          amount: item.amount.toString(),
          memo: item.memo,
          status: item.status,
          timestamp: item.timestamp,
          blockNumber: item.blockNumber === null ? null : item.blockNumber.toString(),
          txHash: item.txHash,
          secretHash: item.secretHash,
          linkState: item.linkState,
          expiresAt: item.expiresAt,
        })),
      lastSyncedBlock: cache.lastSyncedBlock === null ? null : cache.lastSyncedBlock.toString(),
    };

    window.localStorage.setItem(keyFor(account), JSON.stringify(payload));
  } catch (error) {
    console.error("[kolo] could not persist activity", error);
  }
}
