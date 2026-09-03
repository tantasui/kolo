import { parseAbiItem, type PublicClient } from "viem";
import { config } from "@/config";
import type { ActivityItem, ActivityQuery, ActivitySource } from "./types";

const sentEvent = parseAbiItem(
  "event Sent(address indexed from, address indexed to, string fromHandle, string toHandle, address token, uint256 amount, string memo)"
);

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

/**
 * Reads the activity feed straight from `Sent` logs.
 *
 * Monad's public RPC caps eth_getLogs at a 100-block span, so this source
 * advertises that limit via `maxRange` and the store pages within it. That
 * cap is the reason a real indexer earns its place later; swapping in an
 * Envio HyperIndex source means implementing this same interface.
 */
export function createRpcActivitySource(client: PublicClient): ActivitySource {
  return {
    name: "rpc",
    maxRange: config.activity.maxLogRange,

    async getHead() {
      return client.getBlockNumber();
    },

    async fetch({ account, fromBlock, toBlock }: ActivityQuery): Promise<ActivityItem[]> {
      // `from` and `to` are both indexed, so one query per direction.
      const [outgoing, incoming] = await Promise.all([
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

      const rows = [
        ...outgoing.map((log) => ({ log, direction: "out" as const })),
        ...incoming.map((log) => ({ log, direction: "in" as const })),
      ];

      const items = await Promise.all(
        rows.map(async ({ log, direction }): Promise<ActivityItem | null> => {
          const args = log.args;
          if (args.amount === undefined || !args.from || !args.to) return null;

          // Ignore payments in any token other than the one we display.
          if (args.token?.toLowerCase() !== config.contracts.token.toLowerCase()) return null;

          const blockNumber = log.blockNumber ?? null;

          return {
            id: `${log.transactionHash}:${log.logIndex}`,
            direction,
            counterpartyHandle: (direction === "out" ? args.toHandle : args.fromHandle) ?? "",
            counterpartyAddress: direction === "out" ? args.to : args.from,
            amount: args.amount,
            memo: args.memo ?? "",
            status: "confirmed",
            timestamp: blockNumber === null ? null : await timestampOf(client, blockNumber),
            blockNumber,
            txHash: log.transactionHash ?? null,
          };
        })
      );

      return items.filter((item): item is ActivityItem => item !== null);
    },
  };
}
