"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { config } from "@/config";
import {
  createRpcActivitySource,
  loadCachedActivity,
  saveCachedActivity,
  sortActivity,
  type ActivityItem,
  type ActivitySource,
} from "@/lib/activity";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

/** A confirmed row supersedes the optimistic one written when we submitted. */
function matchesPending(pending: ActivityItem, confirmed: ActivityItem): boolean {
  return (
    pending.direction === confirmed.direction &&
    pending.amount === confirmed.amount &&
    pending.counterpartyAddress.toLowerCase() === confirmed.counterpartyAddress.toLowerCase()
  );
}

/**
 * Keeps the activity feed in sync.
 *
 * Reads flow through the `ActivitySource` interface, so replacing the RPC
 * implementation with an Envio HyperIndex one is a one-line swap here and
 * invisible to every component.
 */
export function useActivity() {
  const { address, ready } = useSmartWallet();
  const [items, setItems] = useState<ActivityItem[]>([]);

  const sourceRef = useRef<ActivitySource | null>(null);
  const byIdRef = useRef(new Map<string, ActivityItem>());
  const lastSyncedRef = useRef<bigint | null>(null);
  const accountRef = useRef<Address | null>(null);
  const sweepingRef = useRef(false);

  const publish = useCallback(() => {
    const account = accountRef.current;
    const next = sortActivity([...byIdRef.current.values()]);
    setItems(next);
    if (account) {
      saveCachedActivity(account, { items: next, lastSyncedBlock: lastSyncedRef.current });
    }
  }, []);

  /** Show a payment in the feed the moment it is submitted. */
  const addPending = useCallback(
    (item: Omit<ActivityItem, "id" | "status" | "timestamp" | "blockNumber" | "txHash">) => {
      const pending: ActivityItem = {
        ...item,
        id: `local:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        status: "pending",
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: null,
        txHash: null,
      };
      byIdRef.current.set(pending.id, pending);
      publish();
      return pending.id;
    },
    [publish]
  );

  const sweep = useCallback(async () => {
    const account = accountRef.current;
    const source = sourceRef.current;
    if (!account || !source || sweepingRef.current) return;

    sweepingRef.current = true;
    try {
      const head = await source.getHead();
      const span = source.maxRange;

      // Resume from where we left off; if we have never synced (or have been
      // away a long time) fall back to the widest catch-up we allow.
      const widest = head - span * BigInt(config.activity.maxBackfillWindows) + 1n;
      const resume = lastSyncedRef.current === null ? head - span + 1n : lastSyncedRef.current + 1n;

      let from = resume > widest ? resume : widest;
      if (from < config.deployBlock) from = config.deployBlock;
      if (from < 0n) from = 0n;
      if (from > head) return;

      const fetched: ActivityItem[] = [];
      for (let start = from; start <= head; start += span) {
        const end = start + span - 1n > head ? head : start + span - 1n;
        fetched.push(...(await source.fetch({ account, fromBlock: start, toBlock: end })));
      }

      lastSyncedRef.current = head;

      if (fetched.length === 0) {
        // Still persist the new watermark so the next sweep stays cheap.
        publish();
        return;
      }

      for (const confirmed of fetched) {
        byIdRef.current.set(confirmed.id, confirmed);

        for (const [id, existing] of byIdRef.current) {
          if (existing.status === "pending" && matchesPending(existing, confirmed)) {
            byIdRef.current.delete(id);
          }
        }
      }

      publish();
    } catch (error) {
      console.error("[kolo] activity sweep failed", error);
    } finally {
      sweepingRef.current = false;
    }
  }, [publish]);

  useEffect(() => {
    if (!ready || !address) {
      accountRef.current = null;
      byIdRef.current = new Map();
      lastSyncedRef.current = null;
      setItems([]);
      return;
    }

    accountRef.current = address;
    sourceRef.current = createRpcActivitySource(getPublicClient());

    const cached = loadCachedActivity(address);
    byIdRef.current = new Map(cached.items.map((item) => [item.id, item]));
    lastSyncedRef.current = cached.lastSyncedBlock;
    setItems(sortActivity(cached.items));

    void sweep();
    const timer = setInterval(() => void sweep(), config.activity.pollIntervalMs);
    return () => clearInterval(timer);
  }, [ready, address, sweep]);

  return { items, addPending, refresh: sweep };
}
