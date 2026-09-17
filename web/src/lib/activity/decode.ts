import { parseAbiItem, type Hex } from "viem";
import { config } from "@/config";
import type { ActivityItem } from "./types";

/**
 * Turning logs into feed rows, shared by every `ActivitySource`.
 *
 * Two sources read the same events from different places -- the RPC directly,
 * and Envio HyperSync through our own proxy -- and they must agree exactly on
 * what a log means. Money mapping that lived in each of them separately would
 * drift, and the drift would be silent: a row that reads right from one source
 * and wrong from the other. So the fetching differs and this does not.
 */

export const sentEvent = parseAbiItem(
  "event Sent(address indexed from, address indexed to, string fromHandle, string toHandle, address token, uint256 amount, string memo)"
);

export const linkCreatedEvent = parseAbiItem(
  "event LinkCreated(bytes32 indexed secretHash, address indexed sender, string senderHandle, address token, uint256 amount, string memo, uint64 expiresAt)"
);
export const linkClaimedEvent = parseAbiItem(
  "event LinkClaimed(bytes32 indexed secretHash, address indexed recipient, address token, uint256 amount)"
);
export const linkReclaimedEvent = parseAbiItem(
  "event LinkReclaimed(bytes32 indexed secretHash, address indexed sender, uint256 amount, bool afterExpiry)"
);

export const circleEvents = [
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
export const linkId = (secretHash: Hex) => `link:${secretHash.toLowerCase()}`;

/** The shape both sources hand in: a decoded log, however it was fetched. */
export interface DecodedLog {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
  eventName?: string;
  blockNumber: bigint | null;
  transactionHash: Hex | null;
  logIndex: number | null;
}

const sameToken = (token?: string) =>
  token?.toLowerCase() === config.contracts.token.toLowerCase();

/** A `Sent` log, or null when it is not a payment we display. */
export function paymentItem(log: DecodedLog, direction: "in" | "out"): ActivityItem | null {
  const args = log.args;
  if (args.amount === undefined || !args.from || !args.to) return null;
  // Ignore payments in any token other than the one we display.
  if (!sameToken(args.token)) return null;

  return {
    id: `${log.transactionHash}:${log.logIndex}`,
    kind: "payment",
    direction,
    counterpartyHandle: (direction === "out" ? args.toHandle : args.fromHandle) ?? "",
    counterpartyAddress: direction === "out" ? args.to : args.from,
    amount: args.amount,
    memo: args.memo ?? "",
    status: "confirmed",
    timestamp: null,
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
  };
}

export function linkCreatedItem(log: DecodedLog): ActivityItem | null {
  const args = log.args;
  if (!args.secretHash || args.amount === undefined) return null;
  if (!sameToken(args.token)) return null;

  return {
    id: linkId(args.secretHash),
    kind: "link",
    direction: "out",
    counterpartyHandle: "",
    counterpartyAddress: config.contracts.links,
    amount: args.amount,
    memo: args.memo ?? "",
    status: "confirmed",
    timestamp: null,
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
    secretHash: args.secretHash,
    linkState: "pending",
    expiresAt: args.expiresAt === undefined ? undefined : Number(args.expiresAt),
  };
}

/**
 * Status-only rows. The store merges these onto the row the creation wrote, so
 * the amount, memo and expiry recorded there survive.
 */
export function linkStatusItem(
  log: DecodedLog,
  state: "claimed" | "cancelled"
): ActivityItem | null {
  const args = log.args;
  if (!args.secretHash) return null;

  return {
    id: linkId(args.secretHash),
    kind: "link",
    direction: "out",
    counterpartyHandle: "",
    counterpartyAddress:
      state === "claimed" ? (args.recipient ?? config.contracts.links) : config.contracts.links,
    amount: args.amount ?? 0n,
    memo: "",
    status: "confirmed",
    timestamp: null,
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
    secretHash: args.secretHash,
    linkState: state,
  };
}

/**
 * One circle log into a feed row, or null when it is not about this account.
 *
 * Every circle event carries the member as its second indexed topic, so the
 * whole set can be fetched in one query and sorted out here rather than in
 * five filtered ones.
 */
export function circleItem(log: DecodedLog, account: string): ActivityItem | null {
  const args = log.args ?? {};
  const who: string | undefined = args.account ?? args.recipient;
  if (!who || who.toLowerCase() !== account.toLowerCase()) return null;
  if (args.circleId === undefined) return null;

  const shape: Record<
    string,
    { event: ActivityItem["circleEvent"]; direction: "in" | "out"; amount: bigint }
  > = {
    MemberJoined: { event: "joined", direction: "out", amount: args.deposit ?? 0n },
    Contributed: {
      event: args.fromDeposit ? "missed" : "contributed",
      direction: "out",
      amount: args.amount ?? 0n,
    },
    PaidOut: { event: "paid", direction: "in", amount: args.amount ?? 0n },
    Cured: { event: "cured", direction: "out", amount: args.restored ?? 0n },
  };

  // FellBehind always accompanies a Contributed(fromDeposit) for the same
  // member and round, so it would only ever duplicate that row.
  const found = log.eventName ? shape[log.eventName] : undefined;
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
    blockNumber: log.blockNumber,
    txHash: log.transactionHash,
    circleId: args.circleId,
    circleEvent: found.event,
    round: args.round === undefined ? undefined : Number(args.round),
  };
}
