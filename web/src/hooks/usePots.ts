"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeEventLog, encodeFunctionData, type Address } from "viem";
import { erc20Abi } from "@/abi/erc20";
import { koloPotsAbi } from "@/abi/koloPots";
import { koloRegistryAbi } from "@/abi/koloRegistry";
import { config } from "@/config";
import type { Pot, PotDetail, PotMember, PotStatus } from "@/lib/pots";
import { sendSponsored } from "@/lib/sponsored";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

const STATUS: PotStatus[] = ["open", "closed"];

/** The one place KoloPots.Pot is read. */
function toPot(
  id: bigint,
  raw: {
    creator: Address;
    payee: Address;
    price: bigint;
    used: bigint;
    memberCount: number;
    status: number;
    name: string;
  }
): Pot {
  return {
    id,
    name: raw.name,
    price: raw.price,
    payee: raw.payee,
    creator: raw.creator,
    status: STATUS[raw.status] ?? "open",
    memberCount: Number(raw.memberCount),
    used: raw.used,
  };
}

const client = () => getPublicClient();

async function readPot(id: bigint): Promise<Pot> {
  const raw = await client().readContract({
    address: config.contracts.pots,
    abi: koloPotsAbi,
    functionName: "potOf",
    args: [id],
  });
  return toPot(id, raw);
}

async function readMember(id: bigint, account: Address) {
  return client().readContract({
    address: config.contracts.pots,
    abi: koloPotsAbi,
    functionName: "memberOf",
    args: [id, account],
  });
}

/**
 * Read one pot with every member's row.
 *
 * Exported so the detail screen can refresh on its own clock: a pot changes
 * when somebody else spends, not only when the viewer acts, so its screen has
 * to keep asking rather than wait to be told.
 */
export async function readPotDetail(id: bigint, viewer: Address | null): Promise<PotDetail | null> {
  if (!config.features.pots) return null;

  const pot = await readPot(id);
  if (pot.price === 0n) return null;

  const roster = await client().readContract({
    address: config.contracts.pots,
    abi: koloPotsAbi,
    functionName: "rosterOf",
    args: [id],
  });

  const members: PotMember[] = await Promise.all(
    [...roster].map(async (account) => {
      const [row, handle] = await Promise.all([
        readMember(id, account),
        client()
          .readContract({
            address: config.contracts.registry,
            abi: koloRegistryAbi,
            functionName: "handleOf",
            args: [account],
          })
          .catch(() => ""),
      ]);

      return {
        account,
        handle: handle as string,
        isYou: !!viewer && account.toLowerCase() === viewer.toLowerCase(),
        contributed: row.contributed,
        used: row.used,
        withdrawn: row.withdrawn,
      };
    })
  );

  return {
    ...pot,
    members,
    you: members.find((member) => member.isYou),
    youAreCreator: !!viewer && pot.creator.toLowerCase() === viewer.toLowerCase(),
  };
}

/**
 * The pots this account is in.
 *
 * Membership is not indexed, so this walks every pot and keeps the ones the
 * account has a row in -- the same shape as circles, and fine while a demo
 * holds a handful.
 */
export function usePots() {
  const { address, ready, client: smart } = useSmartWallet();
  const [pots, setPots] = useState<Pot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const addressRef = useRef(address);
  addressRef.current = address;

  const refresh = useCallback(async () => {
    const me = addressRef.current;
    if (!me || !config.features.pots) return;

    try {
      const count = (await client().readContract({
        address: config.contracts.pots,
        abi: koloPotsAbi,
        functionName: "potCount",
      })) as bigint;

      const mine: Pot[] = [];
      for (let id = 1n; id <= count; id++) {
        const row = await readMember(id, me);
        if (!row.joined) continue;
        mine.push(await readPot(id));
      }

      setPots(mine.reverse());
      setLoaded(true);
    } catch (error) {
      console.error("[kolo] could not read pots", error);
    }
  }, []);

  useEffect(() => {
    if (!ready || !address || !config.features.pots) {
      setPots([]);
      setLoaded(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), config.activity.pollIntervalMs * 3);
    return () => clearInterval(timer);
  }, [ready, address, refresh]);

  /** Money in goes with its allowance, so putting in is always one tap. */
  const fund = useCallback(
    async (potId: bigint, amount: bigint, how: "join" | "topUp") => {
      if (!smart) throw new Error("account not ready");

      const calls = [];
      if (amount > 0n) {
        calls.push({
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.pots, amount],
          }),
        });
      }
      calls.push({
        to: config.contracts.pots,
        data: encodeFunctionData({ abi: koloPotsAbi, functionName: how, args: [potId, amount] }),
      });

      await sendSponsored(smart, calls);
      await refresh();
    },
    [smart, refresh]
  );

  const join = useCallback((potId: bigint, amount: bigint) => fund(potId, amount, "join"), [fund]);
  const topUp = useCallback((potId: bigint, amount: bigint) => fund(potId, amount, "topUp"), [fund]);

  /**
   * Open a pot and put the first money in, in one operation.
   *
   * The id comes off the receipt's own `PotCreated` rather than from
   * `potCount`, which somebody else's pot could move between the two calls.
   */
  const create = useCallback(
    async ({
      name,
      price,
      deposit,
      payee,
    }: {
      name: string;
      price: bigint;
      deposit: bigint;
      payee: Address;
    }): Promise<bigint> => {
      if (!smart) throw new Error("account not ready");

      const calls = [];
      if (deposit > 0n) {
        calls.push({
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.pots, deposit],
          }),
        });
      }
      calls.push({
        to: config.contracts.pots,
        data: encodeFunctionData({
          abi: koloPotsAbi,
          functionName: "create",
          args: [name, payee, price, deposit],
        }),
      });

      const hash = await sendSponsored(smart, calls);
      const receipt = await client().waitForTransactionReceipt({ hash });

      let created: bigint | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== config.contracts.pots.toLowerCase()) continue;
        try {
          const parsed = decodeEventLog({ abi: koloPotsAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "PotCreated") {
            created = (parsed.args as { potId: bigint }).potId;
            break;
          }
        } catch {
          // Other events from the same contract in the same operation.
        }
      }
      if (created === null) throw new Error("pot created but its id was not in the receipt");

      await refresh();
      return created;
    },
    [smart, refresh]
  );

  /**
   * Take back everything of yours that has not been spent.
   *
   * Works on a closed pot: closing stops spending, it does not hold anybody's
   * money, and the button says so.
   */
  const withdraw = useCallback(
    async (potId: bigint) => {
      if (!smart) throw new Error("account not ready");
      await sendSponsored(smart, [
        {
          to: config.contracts.pots,
          data: encodeFunctionData({ abi: koloPotsAbi, functionName: "withdraw", args: [potId] }),
        },
      ]);
      await refresh();
    },
    [smart, refresh]
  );

  /** Stop a pot taking new members, top-ups and use. Creator only. */
  const close = useCallback(
    async (potId: bigint) => {
      if (!smart) throw new Error("account not ready");
      await sendSponsored(smart, [
        {
          to: config.contracts.pots,
          data: encodeFunctionData({ abi: koloPotsAbi, functionName: "close", args: [potId] }),
        },
      ]);
      await refresh();
    },
    [smart, refresh]
  );

  return { pots, loaded, refresh, create, join, topUp, withdraw, close };
}

/**
 * One pot, kept fresh.
 *
 * Polled faster than the list: the figures here move when another member
 * spends, and a row that only updated when its owner did something would show
 * a share that is no longer there.
 */
export function usePotDetail(potId: bigint | null) {
  const { address, ready } = useSmartWallet();
  const [detail, setDetail] = useState<PotDetail | null>(null);

  const refresh = useCallback(async () => {
    if (potId === null) return;
    try {
      setDetail(await readPotDetail(potId, address));
    } catch (error) {
      console.error("[kolo] could not read the pot", error);
    }
  }, [potId, address]);

  useEffect(() => {
    if (!ready || potId === null) return;
    void refresh();
    const timer = setInterval(() => void refresh(), config.activity.pollIntervalMs);
    return () => clearInterval(timer);
  }, [ready, potId, refresh]);

  return { detail, refresh };
}
