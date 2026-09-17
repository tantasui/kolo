import { decodeEventLog, type Hex } from "viem";
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
  type DecodedLog,
} from "./decode";
import type { ActivityItem, ActivityQuery, ActivitySource } from "./types";

/**
 * The activity feed, read through Envio HyperSync.
 *
 * The RPC source exists because it needs nothing; this one exists because the
 * RPC caps `eth_getLogs` at 100 blocks, which is about forty seconds of Monad.
 * That cap is why history had to be kept in `localStorage` -- the feed could
 * never rebuild itself, so a cleared browser or a second device started blank.
 * HyperSync answers arbitrary ranges, so the whole history since the deploy
 * block is one sweep and the cache becomes an optimisation rather than the
 * only copy.
 *
 * The token stays on the server: this talks to our own `/api/activity`, never
 * to HyperSync directly. See that route for why.
 */

/** HyperSync answers any range, so a window is a page size, not a ceiling. */
const WINDOW = 50_000n;

const EVENTS = [sentEvent, linkCreatedEvent, linkClaimedEvent, linkReclaimedEvent, ...circleEvents];

interface RawLog {
  block_number: number;
  transaction_hash: Hex;
  log_index: number;
  address: Hex;
  data: Hex;
  topic0?: Hex;
  topic1?: Hex;
  topic2?: Hex;
  topic3?: Hex;
}

/**
 * One raw log into the same decoded shape viem's `getLogs` produces, so both
 * sources feed identical input to the shared mapping.
 *
 * A log we have no ABI for is not an error: the contracts emit events the feed
 * does not show, and they arrive in the same query.
 */
function decode(raw: RawLog): DecodedLog | null {
  const topics = [raw.topic0, raw.topic1, raw.topic2, raw.topic3].filter(
    (topic): topic is Hex => typeof topic === "string"
  );
  if (topics.length === 0) return null;

  for (const event of EVENTS) {
    try {
      const { args, eventName } = decodeEventLog({
        abi: [event],
        data: raw.data,
        topics: topics as [Hex, ...Hex[]],
      });
      return {
        args,
        eventName,
        blockNumber: BigInt(raw.block_number),
        transactionHash: raw.transaction_hash,
        logIndex: raw.log_index,
      };
    } catch {
      // Wrong event for this ABI; try the next.
    }
  }
  return null;
}

const isFrom = (address: Hex | undefined, account: string) =>
  !!address && address.toLowerCase() === account.toLowerCase();

export function createHyperSyncActivitySource(): ActivitySource {
  return {
    name: "hypersync",
    maxRange: WINDOW,
    fullHistory: true,

    async getHead() {
      // How far HyperSync has indexed, not the chain head: asking past it
      // returns nothing, so this is the honest ceiling to page up to.
      const { height } = await status();
      if (height === 0n) throw new Error("hypersync unavailable");
      return height;
    },

    async fetch({ account, fromBlock, toBlock, knownLinkHashes = [] }: ActivityQuery) {
      // The account and the known hashes go up so the filtering happens
      // upstream: without them this would download every log these contracts
      // ever emitted and drop almost all of it on the phone.
      const response = await fetch("/api/activity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fromBlock: Number(fromBlock),
          toBlock: Number(toBlock),
          account,
          linkHashes: knownLinkHashes,
        }),
      });

      if (response.status === 429) {
        // Backing off is the store's job -- it sweeps on a timer and the
        // watermark has not moved, so the next tick simply asks again.
        throw new Error("hypersync rate limited");
      }
      if (!response.ok) throw new Error(`hypersync ${response.status}`);
      const { logs } = (await response.json()) as { logs: RawLog[] };

      const items: ActivityItem[] = [];
      const ours = new Set<string>(knownLinkHashes.map((hash) => hash.toLowerCase()));

      // The route already filtered to this account. Re-checking here is not
      // redundant: `Sent` still has to be resolved to a direction, and a source
      // that trusts its transport to have filtered correctly is a source that
      // shows somebody else's payment the day the filter is wrong.
      for (const raw of logs) {
        const log = decode(raw);
        if (!log) continue;

        const where = raw.address.toLowerCase();

        if (where === config.contracts.pay.toLowerCase() && log.eventName === "Sent") {
          // Unlike the RPC source this is not two filtered queries, so which
          // side of the payment the viewer is on is decided here.
          const direction = isFrom(log.args.from, account)
            ? "out"
            : isFrom(log.args.to, account)
              ? "in"
              : null;
          if (!direction) continue;
          const item = paymentItem(log, direction);
          if (item) items.push(item);
          continue;
        }

        if (where === config.contracts.links.toLowerCase()) {
          if (log.eventName === "LinkCreated") {
            if (!isFrom(log.args.sender, account)) continue;
            const item = linkCreatedItem(log);
            if (!item) continue;
            if (item.secretHash) ours.add(item.secretHash.toLowerCase());
            items.push(item);
          } else if (log.eventName === "LinkClaimed") {
            const hash: Hex | undefined = log.args.secretHash;
            if (!hash || !ours.has(hash.toLowerCase())) continue;
            const item = linkStatusItem(log, "claimed");
            if (item) items.push(item);
          } else if (log.eventName === "LinkReclaimed") {
            if (!isFrom(log.args.sender, account)) continue;
            const item = linkStatusItem(log, "cancelled");
            if (item) items.push(item);
          }
          continue;
        }

        if (where === config.contracts.circle.toLowerCase()) {
          const item = circleItem(log, account);
          if (item) items.push(item);
        }
      }

      return items;
    },
  };
}

async function status(): Promise<{ available: boolean; height: bigint }> {
  try {
    const response = await fetch("/api/activity", { method: "GET" });
    if (!response.ok) return { available: false, height: 0n };
    const body = (await response.json()) as { available?: boolean; height?: number };
    return { available: body.available === true, height: BigInt(body.height ?? 0) };
  } catch {
    return { available: false, height: 0n };
  }
}

/** Whether the server has a token, so the store knows to prefer this source. */
export async function hyperSyncAvailable(): Promise<boolean> {
  return (await status()).available;
}
