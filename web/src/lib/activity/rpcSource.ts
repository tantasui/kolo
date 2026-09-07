import { parseAbiItem, type Hex, type PublicClient } from "viem";
import { config } from "@/config";
import type { ActivityItem, ActivityQuery, ActivitySource } from "./types";

const sentEvent = parseAbiItem(
  "event Sent(address indexed from, address indexed to, string fromHandle, string toHandle, address token, uint256 amount, string memo)"
);

const linkCreatedEvent = parseAbiItem(
  "event LinkCreated(bytes32 indexed secretHash, address indexed sender, string senderHandle, address token, uint256 amount, string memo, uint64 expiresAt)"
);
const linkClaimedEvent = parseAbiItem(
  "event LinkClaimed(bytes32 indexed secretHash, address indexed recipient, address token, uint256 amount)"
);
const linkReclaimedEvent = parseAbiItem(
  "event LinkReclaimed(bytes32 indexed secretHash, address indexed sender, uint256 amount, bool afterExpiry)"
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

/** Every event about one link lands on one row. */
const linkId = (secretHash: Hex) => `link:${secretHash.toLowerCase()}`;

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

      const [[outgoing, incoming], [created, claimed, reclaimed]] = await Promise.all([
        paymentLogs,
        linkLogs,
      ]);

      const items: ActivityItem[] = [];

      const payments = [
        ...outgoing.map((log) => ({ log, direction: "out" as const })),
        ...incoming.map((log) => ({ log, direction: "in" as const })),
      ];

      for (const { log, direction } of payments) {
        const args = log.args;
        if (args.amount === undefined || !args.from || !args.to) continue;
        // Ignore payments in any token other than the one we display.
        if (args.token?.toLowerCase() !== config.contracts.token.toLowerCase()) continue;

        const blockNumber = log.blockNumber ?? null;

        items.push({
          id: `${log.transactionHash}:${log.logIndex}`,
          kind: "payment",
          direction,
          counterpartyHandle: (direction === "out" ? args.toHandle : args.fromHandle) ?? "",
          counterpartyAddress: direction === "out" ? args.to : args.from,
          amount: args.amount,
          memo: args.memo ?? "",
          status: "confirmed",
          timestamp: blockNumber === null ? null : await timestampOf(client, blockNumber),
          blockNumber,
          txHash: log.transactionHash ?? null,
        });
      }

      // Links we just created are ours too, so a claim landing in the same
      // window as its creation is still recognised.
      const ours = new Set<string>(knownLinkHashes.map((hash) => hash.toLowerCase()));

      for (const log of created) {
        const args = log.args;
        if (!args.secretHash || args.amount === undefined) continue;
        if (args.token?.toLowerCase() !== config.contracts.token.toLowerCase()) continue;

        ours.add(args.secretHash.toLowerCase());
        const blockNumber = log.blockNumber ?? null;

        items.push({
          id: linkId(args.secretHash),
          kind: "link",
          direction: "out",
          counterpartyHandle: "",
          counterpartyAddress: config.contracts.links,
          amount: args.amount,
          memo: args.memo ?? "",
          status: "confirmed",
          timestamp: blockNumber === null ? null : await timestampOf(client, blockNumber),
          blockNumber,
          txHash: log.transactionHash ?? null,
          secretHash: args.secretHash,
          linkState: "pending",
          expiresAt: args.expiresAt === undefined ? undefined : Number(args.expiresAt),
        });
      }

      // Status-only rows: the store merges these onto the row the creation
      // wrote, so the amount and memo recorded there survive.
      for (const log of claimed) {
        const args = log.args;
        if (!args.secretHash || !ours.has(args.secretHash.toLowerCase())) continue;

        const blockNumber = log.blockNumber ?? null;

        items.push({
          id: linkId(args.secretHash),
          kind: "link",
          direction: "out",
          counterpartyHandle: "",
          counterpartyAddress: args.recipient ?? config.contracts.links,
          amount: args.amount ?? 0n,
          memo: "",
          status: "confirmed",
          timestamp: blockNumber === null ? null : await timestampOf(client, blockNumber),
          blockNumber,
          txHash: log.transactionHash ?? null,
          secretHash: args.secretHash,
          linkState: "claimed",
        });
      }

      for (const log of reclaimed) {
        const args = log.args;
        if (!args.secretHash) continue;

        const blockNumber = log.blockNumber ?? null;

        items.push({
          id: linkId(args.secretHash),
          kind: "link",
          direction: "out",
          counterpartyHandle: "",
          counterpartyAddress: config.contracts.links,
          amount: args.amount ?? 0n,
          memo: "",
          status: "confirmed",
          timestamp: blockNumber === null ? null : await timestampOf(client, blockNumber),
          blockNumber,
          txHash: log.transactionHash ?? null,
          secretHash: args.secretHash,
          linkState: "cancelled",
        });
      }

      return items;
    },
  };
}
