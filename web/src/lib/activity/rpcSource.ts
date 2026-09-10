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

const circleEvents = [
  parseAbiItem(
    "event MemberJoined(uint256 indexed circleId, address indexed account, string handle, uint8 position, uint256 deposit)"
  ),
  parseAbiItem(
    "event Contributed(uint256 indexed circleId, address indexed account, uint8 round, uint256 amount, bool fromDeposit)"
  ),
  parseAbiItem(
    "event PaidOut(uint256 indexed circleId, address indexed recipient, string handle, uint8 round, uint256 amount)"
  ),
  parseAbiItem("event FellBehind(uint256 indexed circleId, address indexed account, uint256 drawn)"),
  parseAbiItem("event Cured(uint256 indexed circleId, address indexed account, uint256 restored)"),
] as const;

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

      for (const log of circleRaw) {
        const item = circleItemFrom(log, account);
        if (!item) continue;
        item.timestamp = log.blockNumber == null ? null : await timestampOf(client, log.blockNumber);
        items.push(item);
      }

      return items;
    },
  };
}

/**
 * One circle log into a feed row, or null when it is not about this account.
 *
 * Every circle event carries the member as its second indexed topic, so the
 * whole set can be fetched in one query and sorted out here rather than in
 * five filtered ones.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function circleItemFrom(log: any, account: string): ActivityItem | null {
  const args = log.args ?? {};
  const who: string | undefined = args.account ?? args.recipient;
  if (!who || who.toLowerCase() !== account.toLowerCase()) return null;
  if (args.circleId === undefined) return null;

  const shape: Record<string, { event: ActivityItem["circleEvent"]; direction: "in" | "out"; amount: bigint }> = {
    MemberJoined: { event: "joined", direction: "out", amount: args.deposit ?? 0n },
    Contributed: { event: args.fromDeposit ? "missed" : "contributed", direction: "out", amount: args.amount ?? 0n },
    PaidOut: { event: "paid", direction: "in", amount: args.amount ?? 0n },
    Cured: { event: "cured", direction: "out", amount: args.restored ?? 0n },
  };

  // FellBehind always accompanies a Contributed(fromDeposit) for the same
  // member and round, so it would only ever duplicate that row.
  const found = shape[log.eventName];
  if (!found) return null;

  return {
    id: `${log.transactionHash}:${log.logIndex}`,
    kind: "circle",
    direction: found.direction,
    counterpartyHandle: "",
    counterpartyAddress: config.contracts.circle,
    amount: found.amount,
    memo: "",
    status: "confirmed",
    timestamp: null,
    blockNumber: log.blockNumber ?? null,
    txHash: log.transactionHash ?? null,
    circleId: args.circleId,
    circleEvent: found.event,
    round: args.round === undefined ? undefined : Number(args.round),
  };
}
