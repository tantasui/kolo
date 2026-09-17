import { encodeEventTopics, type AbiEvent, type Hex } from "viem";
import { config } from "@/config";
import {
  circleEvents,
  linkClaimedEvent,
  linkCreatedEvent,
  linkReclaimedEvent,
  sentEvent,
} from "./decode";

/**
 * Which logs HyperSync should return for one viewer.
 *
 * The feed is a personal view, so the query should be one too. Asking for
 * every log these contracts ever emitted and discarding the rest in the
 * browser works, but it ships the whole world to a phone to keep a handful of
 * rows — and on a full-history sweep that is every payment, link and circle
 * Kolo has ever seen.
 *
 * Every event here carries the member as its **second** indexed topic, so the
 * filtering can be done upstream. `Sent` is the exception in shape rather than
 * kind: the viewer can be either side, so it takes two selections.
 *
 * These filters can only ever *narrow* what comes back. The contract addresses
 * are still fixed by the caller of this function, never by the client, so
 * accepting an account and a list of link hashes cannot widen the query — it
 * is the difference between "your rows" and "everyone's rows", both of which
 * are public on chain either way.
 */

export interface LogSelection {
  address: string[];
  /** Positional: [topic0, topic1, topic2, topic3]. An empty slot is a wildcard. */
  topics: string[][];
}

const selectorOf = (event: AbiEvent): string => encodeEventTopics({ abi: [event] })[0] as string;

/** An address as a 32-byte topic: left-padded, lowercase. */
export function addressTopic(address: string): string {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

export const isAddressLike = (value: unknown): value is string =>
  typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);

export const isHash32 = (value: unknown): value is Hex =>
  typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);

/**
 * How many of the viewer's own link hashes we will filter claims by.
 *
 * `LinkClaimed` is indexed by secret hash and not by the claimer, so "was my
 * link collected?" cannot be asked by account — the same reason the RPC source
 * fetches claims unfiltered. Naming the hashes instead keeps it narrow, and
 * the cap keeps one request from carrying an unbounded topic list.
 */
export const MAX_LINK_HASHES = 200;

export function buildLogSelections(account: string, linkHashes: readonly Hex[]): LogSelection[] {
  const who = addressTopic(account);
  const selections: LogSelection[] = [];

  const pay = config.contracts.pay;
  const links = config.contracts.links;
  const circle = config.contracts.circle;

  if (pay !== "0x") {
    const sent = selectorOf(sentEvent);
    // The viewer is either the sender or the recipient, and topics are
    // positional, so one selection cannot express "either side".
    selections.push({ address: [pay], topics: [[sent], [who], []] });
    selections.push({ address: [pay], topics: [[sent], [], [who]] });
  }

  if (links !== "0x") {
    // Created and reclaimed both carry the sender in topic2.
    selections.push({
      address: [links],
      topics: [[selectorOf(linkCreatedEvent), selectorOf(linkReclaimedEvent)], [], [who]],
    });

    // Claims are keyed by the secret, so they are asked for by name.
    const hashes = linkHashes.slice(0, MAX_LINK_HASHES).map((hash) => hash.toLowerCase());
    if (hashes.length > 0) {
      selections.push({
        address: [links],
        topics: [[selectorOf(linkClaimedEvent)], hashes, []],
      });
    }
  }

  if (circle !== "0x") {
    selections.push({
      address: [circle],
      topics: [circleEvents.map(selectorOf), [], [who]],
    });
  }

  return selections;
}
