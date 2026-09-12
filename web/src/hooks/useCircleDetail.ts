"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { koloCircleAbi } from "@/abi/koloCircle";
import { koloRegistryAbi } from "@/abi/koloRegistry";
import { config } from "@/config";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";
import type { CircleStatus } from "./useCircles";

/**
 * Where a member stands in the rotation.
 *
 * `behind` is not a fourth kind of member -- it is a standing that sits on top
 * of waiting or next, and it is checked first because it changes what the
 * circle will do with them.
 */
export type SeatState = "received" | "next" | "behind" | "waiting";

export interface Seat {
  account: Address;
  handle: string;
  position: number;
  isYou: boolean;
  state: SeatState;
  /** True once they have put in for the round now open. */
  paidThisRound: boolean;
  deposit: bigint;
  depositDrawn: bigint;
  /** Which round paid them; only meaningful when `state` is "received". */
  paidInRound: number;
}

export interface CircleDetail {
  id: bigint;
  name: string;
  contribution: bigint;
  size: number;
  round: number;
  roundEndsAt: number;
  status: CircleStatus;
  /** The pot a full round pays out. */
  pot: bigint;
  collected: bigint;
  paidInCount: number;
  seats: Seat[];
  you?: Seat;
}

const STATUS: CircleStatus[] = ["forming", "running", "complete", "cancelled"];

/**
 * Everything one circle's screen shows.
 *
 * Read straight from the contract rather than from the feed: the feed only
 * sees a 100-block window, and a rotation has to be right about who has been
 * paid however long ago it happened.
 */
export function useCircleDetail(circleId: bigint | null) {
  const { address, ready } = useSmartWallet();
  const [detail, setDetail] = useState<CircleDetail | null>(null);

  const refresh = useCallback(async () => {
    if (circleId === null || !config.features.circles) return;

    try {
      const client = getPublicClient();
      const [circle, members] = await Promise.all([
        client.readContract({
          address: config.contracts.circle,
          abi: koloCircleAbi,
          functionName: "circleOf",
          args: [circleId],
        }),
        client.readContract({
          address: config.contracts.circle,
          abi: koloCircleAbi,
          functionName: "membersOf",
          args: [circleId],
        }),
      ]);

      if (circle.size === 0) {
        setDetail(null);
        return;
      }

      const [handles, paidFlags, collected] = await Promise.all([
        Promise.all(
          members.map((member) =>
            client
              .readContract({
                address: config.contracts.registry,
                abi: koloRegistryAbi,
                functionName: "handleOf",
                args: [member.account],
              })
              .catch(() => "")
          )
        ),
        Promise.all(
          members.map((member) =>
            client
              .readContract({
                address: config.contracts.circle,
                abi: koloCircleAbi,
                functionName: "hasContributed",
                args: [circleId, member.account],
              })
              .catch(() => false)
          )
        ),
        client.readContract({
          address: config.contracts.circle,
          abi: koloCircleAbi,
          functionName: "collectedThisRound",
          args: [circleId],
        }),
      ]);

      // Next in line is the first member still owed a pot who is standing --
      // exactly the choice the contract makes when it pays out.
      const nextIndex = members.findIndex(
        (member) => !member.received && member.depositDrawn === 0n
      );

      const seats: Seat[] = members.map((member, i) => {
        const behind = member.depositDrawn > 0n;
        const state: SeatState = member.received
          ? "received"
          : behind
            ? "behind"
            : i === nextIndex
              ? "next"
              : "waiting";

        return {
          account: member.account,
          handle: handles[i] as string,
          position: member.position,
          isYou: !!address && member.account.toLowerCase() === address.toLowerCase(),
          state,
          paidThisRound: paidFlags[i] as boolean,
          deposit: member.deposit,
          depositDrawn: member.depositDrawn,
          paidInRound: member.paidInRound,
        };
      });

      setDetail({
        id: circleId,
        name: circle.name,
        contribution: circle.contribution,
        size: circle.size,
        round: circle.round,
        roundEndsAt: Number(circle.roundEndsAt),
        status: STATUS[circle.status] ?? "forming",
        pot: circle.contribution * BigInt(circle.size),
        collected: collected as bigint,
        paidInCount: seats.filter((seat) => seat.paidThisRound).length,
        seats,
        you: seats.find((seat) => seat.isYou),
      });
    } catch (error) {
      console.error("[kolo] could not read the circle", error);
    }
  }, [circleId, address]);

  useEffect(() => {
    if (!ready || circleId === null) return;
    void refresh();
    const timer = setInterval(() => void refresh(), config.activity.pollIntervalMs * 2);
    return () => clearInterval(timer);
  }, [ready, circleId, refresh]);

  return { detail, refresh };
}

/** Rounds already paid out, newest first. */
export function payoutHistory(detail: CircleDetail): Seat[] {
  return detail.seats
    .filter((seat) => seat.state === "received")
    .sort((a, b) => b.paidInRound - a.paidInRound);
}
