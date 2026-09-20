"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeEventLog, encodeFunctionData, type Address } from "viem";
import { erc20Abi } from "@/abi/erc20";
import { koloGoalsAbi } from "@/abi/koloGoals";
import { config } from "@/config";
import type { Goal } from "@/lib/goals";
import { sendSponsored } from "@/lib/sponsored";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

/**
 * Goals only change when their owner acts -- nobody else can add to or take
 * from one -- so polling is only for the same person on a second device, and
 * does not need the feed's pace.
 */
const POLL_MS = config.activity.pollIntervalMs * 5;

/**
 * The one place the contract's `Goal` tuple is read. If KoloGoals.Goal ever
 * changes shape, this and abi/koloGoals.ts are what change.
 */
function toGoal(
  id: bigint,
  raw: {
    label: string;
    target: bigint;
    saved: bigint;
    targetDate: bigint;
    reached: boolean;
    reachedAt: bigint;
  }
): Goal {
  return {
    id,
    label: raw.label,
    target: raw.target,
    saved: raw.saved,
    targetDate: Number(raw.targetDate),
    reached: raw.reached,
    reachedAt: Number(raw.reachedAt),
  };
}

async function readGoalIds(owner: Address): Promise<bigint[]> {
  const ids = await getPublicClient().readContract({
    address: config.contracts.goals,
    abi: koloGoalsAbi,
    functionName: "goalIdsOf",
    args: [owner],
  });
  return [...ids];
}

async function readGoal(id: bigint): Promise<Goal> {
  const raw = await getPublicClient().readContract({
    address: config.contracts.goals,
    abi: koloGoalsAbi,
    functionName: "goalOf",
    args: [id],
  });
  return toGoal(id, raw);
}

export function useGoals() {
  const { address, ready, client } = useSmartWallet();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const addressRef = useRef(address);
  addressRef.current = address;

  const refresh = useCallback(async () => {
    const owner = addressRef.current;
    if (!owner || !config.features.goals) return;

    try {
      const ids = await readGoalIds(owner);
      const found = await Promise.all(ids.map(readGoal));
      // Newest first: the goal you just made is the one you came to look at.
      setGoals(found.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)));
      setLoaded(true);
    } catch (error) {
      console.error("[kolo] could not read goals", error);
    }
  }, []);

  useEffect(() => {
    if (!ready || !address || !config.features.goals) {
      setGoals([]);
      setLoaded(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [ready, address, refresh]);

  /**
   * Record a goal. Moves no money, so there is no allowance to batch.
   *
   * The id comes off the receipt's own `GoalCreated` rather than from
   * `goalCount`, which somebody else's goal could move between the two calls.
   */
  const create = useCallback(
    async ({
      label,
      target,
      targetDate,
    }: {
      label: string;
      target: bigint;
      targetDate: number;
    }): Promise<bigint> => {
      if (!client) throw new Error("account not ready");

      const hash = await sendSponsored(client, [
        {
          to: config.contracts.goals,
          data: encodeFunctionData({
            abi: koloGoalsAbi,
            functionName: "create",
            args: [label, target, BigInt(targetDate)],
          }),
        },
      ]);

      const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
      let created: bigint | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== config.contracts.goals.toLowerCase()) continue;
        try {
          const parsed = decodeEventLog({ abi: koloGoalsAbi, data: log.data, topics: log.topics });
          if (parsed.eventName === "GoalCreated") {
            created = (parsed.args as { goalId: bigint }).goalId;
            break;
          }
        } catch {
          // Other events from the same contract in the same operation.
        }
      }
      if (created === null) throw new Error("goal created but its id was not in the receipt");

      await refresh();
      return created;
    },
    [client, refresh]
  );

  /**
   * Set money aside. The allowance and the contribution go out as one
   * sponsored operation, so it is one tap.
   *
   * Returns the goal as it stands afterwards, read fresh from the contract,
   * so the caller can tell whether this is the contribution that reached it.
   */
  const contribute = useCallback(
    async (goal: Goal, amount: bigint): Promise<Goal> => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.goals, amount],
          }),
        },
        {
          to: config.contracts.goals,
          data: encodeFunctionData({
            abi: koloGoalsAbi,
            functionName: "contribute",
            args: [goal.id, amount],
          }),
        },
      ]);

      const after = await readGoal(goal.id);
      await refresh();
      return after;
    },
    [client, refresh]
  );

  /** Take money back. Any amount, any time -- nothing is locked. */
  const withdraw = useCallback(
    async (goal: Goal, amount: bigint): Promise<Goal> => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.goals,
          data: encodeFunctionData({
            abi: koloGoalsAbi,
            functionName: "withdraw",
            args: [goal.id, amount],
          }),
        },
      ]);

      const after = await readGoal(goal.id);
      await refresh();
      return after;
    },
    [client, refresh]
  );

  return { goals, loaded, refresh, create, contribute, withdraw };
}
