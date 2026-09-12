import type { PublicClient } from "viem";
import { config } from "@/config";
import {
  circleEvents,
  circleItem,
  linkClaimedEvent,
  linkCreatedEvent,
  linkCreatedItem,
  linkReclaimedEvent,
  linkStatusItem,
  paymentItem,
  sentEvent,
} from "./decode";
import type { ActivityItem, ActivityQuery, ActivitySource } from "./types";

/** Block timestamps are immutable, so cache them across polls. */
const blockTimestamps = new Map<string, number>();

async function timestampOf(client: PublicClient, blockNumber: bigint): Promise<number | null> {
  const key = blockNumber.toString();
  const cached = blockTimestamps.get(key);
  if (cached !== undefined) return cached;

  try {
    const block = await client.getBlock({ blockNumber });
    const seconds = Number(block.timestamp);
    blockTimestamps.set(key, seconds);
    return seconds;
  } catch {
    // A missing timestamp only softens the "when" label; never fail the feed.
    return null;
  }
}

/** Rows carry no time until a block is looked up; only this source pays that cost. */
async function withTime(client: PublicClient, item: ActivityItem): Promise<ActivityItem> {
  if (item.blockNumber === null) return item;
  return { ...item, timestamp: await timestampOf(client, item.blockNumber) };
}

/**
 * Reads the activity feed straight from `Sent` and `KoloLinks` logs.
 *
 * Monad's public RPC caps eth_getLogs at a 100-block span, so this source
 * advertises that limit via `maxRange` and the store pages within it. That
 * cap is the reason a real indexer earns its place later; swapping in an
 * Envio HyperIndex source means implementing this same interface.
 */
export function createRpcActivitySource(client: PublicClient): ActivitySource {
  const linksConfigured = config.features.claimLinks;

  return {
    name: "rpc",
    maxRange: config.activity.maxLogRange,

    async getHead() {
      return client.getBlockNumber();
    },

    async fetch({ account, fromBlock, toBlock, knownLinkHashes = [] }: ActivityQuery) {
      // `from` and `to` are both indexed, so one query per direction.
      const paymentLogs = Promise.all([
        client.getLogs({
          address: config.contracts.pay,
          event: sentEvent,
          args: { from: account },
          fromBlock,
          toBlock,
        }),
        client.getLogs({
          address: config.contracts.pay,
          event: sentEvent,
          args: { to: account },
          fromBlock,
          toBlock,
        }),
      ]);

      // Claims and reclaims are indexed by secret hash, not by sender, so they
      // are fetched unfiltered and matched against links we know are ours.
      const linkLogs = linksConfigured
        ? Promise.all([
            client.getLogs({
              address: config.contracts.links,
              event: linkCreatedEvent,
              args: { sender: account },
              fromBlock,
              toBlock,
            }),
            client.getLogs({
              address: config.contracts.links,
              event: linkClaimedEvent,
              fromBlock,
              toBlock,
            }),
            client.getLogs({
              address: config.contracts.links,
              event: linkReclaimedEvent,
              args: { sender: account },
              fromBlock,
              toBlock,
            }),
          ])
        : Promise.resolve([[], [], []] as const);

      // One query for every circle event rather than five: they all live on
      // one contract, the volume in a 100-block window is tiny, and the feed
      // already pages within that cap. Filtering happens below.
      const circleLogs = config.features.circles
        ? client.getLogs({
            address: config.contracts.circle,
            events: circleEvents,
            fromBlock,
            toBlock,
          })
        : Promise.resolve([]);

      const [[outgoing, incoming], [created, claimed, reclaimed], circleRaw] = await Promise.all([
        paymentLogs,
        linkLogs,
        circleLogs,
      ]);

      const items: ActivityItem[] = [];

      const payments = [
        ...outgoing.map((log) => ({ log, direction: "out" as const })),
        ...incoming.map((log) => ({ log, direction: "in" as const })),
      ];

      for (const { log, direction } of payments) {
        const item = paymentItem(log, direction);
        if (item) items.push(await withTime(client, item));
      }

      // Links we just created are ours too, so a claim landing in the same
      // window as its creation is still recognised.
      const ours = new Set<string>(knownLinkHashes.map((hash) => hash.toLowerCase()));

      for (const log of created) {
        const item = linkCreatedItem(log);
        if (!item) continue;
        if (item.secretHash) ours.add(item.secretHash.toLowerCase());
        items.push(await withTime(client, item));
      }

      // Status-only rows: the store merges these onto the row the creation
      // wrote, so the amount and memo recorded there survive.
      for (const log of claimed) {
        const hash = log.args.secretHash;
        if (!hash || !ours.has(hash.toLowerCase())) continue;
        const item = linkStatusItem(log, "claimed");
        if (item) items.push(await withTime(client, item));
      }

      for (const log of reclaimed) {
        const item = linkStatusItem(log, "cancelled");
        if (item) items.push(await withTime(client, item));
      }

      for (const log of circleRaw) {
        const item = circleItem(log, account);
        if (item) items.push(await withTime(client, item));
      }

      return items;
    },
  };
}

