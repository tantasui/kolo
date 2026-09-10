"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeFunctionData } from "viem";
import { erc20Abi } from "@/abi/erc20";
import { koloCircleAbi } from "@/abi/koloCircle";
import { config } from "@/config";
import { sendSponsored } from "@/lib/sponsored";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

/** Status values mirror KoloCircle.Status. */
export type CircleStatus = "forming" | "running" | "complete";

const STATUS: CircleStatus[] = ["forming", "running", "complete"];

export interface CircleSummary {
  id: bigint;
  name: string;
  contribution: bigint;
  size: number;
  joined: number;
  round: number;
  roundEndsAt: number;
  status: CircleStatus;
  /** True once this account has put in for the current round. */
  contributed: boolean;
  /** Non-zero means Behind: what they must put back to rejoin the rotation. */
  toCure: bigint;
}

/** Seconds until this circle's contribution is due; negative once overdue. */
export function secondsUntilDue(circle: CircleSummary, now = Date.now() / 1000): number {
  return circle.roundEndsAt - now;
}

/**
 * A circle needs the member's attention when it is running, they have not put
 * in yet, and the deadline is inside the window. Overdue counts: the moment it
 * passes is when saying something matters most.
 */
export function isDueSoon(circle: CircleSummary, now = Date.now() / 1000): boolean {
  if (circle.status !== "running" || circle.contributed) return false;
  return secondsUntilDue(circle, now) <= config.circles.dueSoonSeconds;
}

/** "in 6 hours", "in 20 minutes", "now" -- never a date. */
export function dueLabel(seconds: number): string {
  if (seconds <= 0) return "now";
  if (seconds < 3600) return `in ${Math.max(1, Math.round(seconds / 60))} minutes`;
  if (seconds < 86400) return `in ${Math.round(seconds / 3600)} hours`;
  return `in ${Math.round(seconds / 86400)} days`;
}

/** What an invite shows before anyone signs in. */
export interface CircleInvite {
  id: bigint;
  name: string;
  contribution: bigint;
  size: number;
  joined: number;
  roundDuration: number;
  status: CircleStatus;
  /** The position the next person to join takes, 0-based. */
  nextPosition: number;
  /** What that position must post today. */
  deposit: bigint;
}

/**
 * Read a circle from its invite code. Works signed out on purpose: someone
 * deciding whether to join needs the numbers before they have an account, and
 * must be able to walk away without making one.
 */
export async function lookUpInvite(circleId: bigint): Promise<CircleInvite | null> {
  if (!config.features.circles) return null;

  const publicClient = getPublicClient();
  const circle = await publicClient.readContract({
    address: config.contracts.circle,
    abi: koloCircleAbi,
    functionName: "circleOf",
    args: [circleId],
  });

  if (circle.size === 0) return null;

  const nextPosition = circle.joined;
  const deposit = await publicClient.readContract({
    address: config.contracts.circle,
    abi: koloCircleAbi,
    functionName: "depositFor",
    args: [circle.size, nextPosition, circle.contribution],
  });

  return {
    id: circleId,
    name: circle.name,
    contribution: circle.contribution,
    size: circle.size,
    joined: circle.joined,
    roundDuration: Number(circle.roundDuration),
    status: STATUS[circle.status] ?? "forming",
    nextPosition,
    deposit: deposit as bigint,
  };
}

/**
 * The circles this account belongs to.
 *
 * Membership is not indexed anywhere, so this walks the circles the contract
 * has ever created and keeps the ones the account is in. Fine while a demo
 * holds a handful; the same reason the activity feed wants a real indexer.
 */
export function useCircles() {
  const { address, ready, client } = useSmartWallet();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const addressRef = useRef(address);
  addressRef.current = address;

  const refresh = useCallback(async () => {
    const account = addressRef.current;
    if (!account || !config.features.circles) return;

    try {
      const publicClient = getPublicClient();
      const count = await publicClient.readContract({
        address: config.contracts.circle,
        abi: koloCircleAbi,
        functionName: "circleCount",
      });

      const found: CircleSummary[] = [];

      for (let id = 1n; id <= (count as bigint); id++) {
        const member = await publicClient.readContract({
          address: config.contracts.circle,
          abi: koloCircleAbi,
          functionName: "isMember",
          args: [id, account],
        });
        if (!member) continue;

        const [circle, contributed, toCure] = await Promise.all([
          publicClient.readContract({
            address: config.contracts.circle,
            abi: koloCircleAbi,
            functionName: "circleOf",
            args: [id],
          }),
          publicClient.readContract({
            address: config.contracts.circle,
            abi: koloCircleAbi,
            functionName: "hasContributed",
            args: [id, account],
          }),
          publicClient.readContract({
            address: config.contracts.circle,
            abi: koloCircleAbi,
            functionName: "amountToCure",
            args: [id, account],
          }),
        ]);

        found.push({
          id,
          name: circle.name,
          contribution: circle.contribution,
          size: circle.size,
          joined: circle.joined,
          round: circle.round,
          roundEndsAt: Number(circle.roundEndsAt),
          status: STATUS[circle.status] ?? "forming",
          contributed: contributed as boolean,
          toCure: toCure as bigint,
        });
      }

      setCircles(found);
    } catch (error) {
      console.error("[kolo] could not read circles", error);
    }
  }, []);

  useEffect(() => {
    if (!ready || !address || !config.features.circles) {
      setCircles([]);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), config.activity.pollIntervalMs * 3);
    return () => clearInterval(timer);
  }, [ready, address, refresh]);

  /** Put in this round, allowance batched with it so it is one tap. */
  const contribute = useCallback(
    async (circle: CircleSummary) => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.circle, circle.contribution],
          }),
        },
        {
          to: config.contracts.circle,
          data: encodeFunctionData({
            abi: koloCircleAbi,
            functionName: "contribute",
            args: [circle.id],
          }),
        },
      ]);

      await refresh();
    },
    [client, refresh]
  );

  /** Put the deposit back and rejoin the rotation. */
  const cure = useCallback(
    async (circle: CircleSummary) => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.circle, circle.toCure],
          }),
        },
        {
          to: config.contracts.circle,
          data: encodeFunctionData({
            abi: koloCircleAbi,
            functionName: "cure",
            args: [circle.id],
          }),
        },
      ]);

      await refresh();
    },
    [client, refresh]
  );

  /** Take the next free position, deposit batched with it so it is one tap. */
  const join = useCallback(
    async (invite: CircleInvite) => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.circle, invite.deposit],
          }),
        },
        {
          to: config.contracts.circle,
          data: encodeFunctionData({
            abi: koloCircleAbi,
            functionName: "join",
            args: [invite.id],
          }),
        },
      ]);

      await refresh();
    },
    [client, refresh]
  );

  return { circles, refresh, contribute, cure, join };
}
