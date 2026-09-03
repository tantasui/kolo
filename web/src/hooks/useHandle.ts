"use client";

import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData } from "viem";
import { koloRegistryAbi } from "@/abi/koloRegistry";
import { config } from "@/config";
import { sendSponsored } from "@/lib/sponsored";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

export type HandleStatus = "loading" | "unregistered" | "registered";

export function useHandle() {
  const { address, ready, client } = useSmartWallet();
  const [handle, setHandle] = useState<string | null>(null);
  const [status, setStatus] = useState<HandleStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  const refresh = useCallback(async () => {
    if (!address) {
      setHandle(null);
      setStatus("loading");
      return;
    }

    try {
      const existing = await getPublicClient().readContract({
        address: config.contracts.registry,
        abi: koloRegistryAbi,
        functionName: "handleOf",
        args: [address],
      });

      if (existing) {
        setHandle(existing);
        setStatus("registered");
      } else {
        setHandle(null);
        setStatus("unregistered");
      }
    } catch (error) {
      console.error("[kolo] could not read handle", error);
      // Stay on the loading screen but keep trying, so a flaky first read
      // does not strand the user there.
      setStatus("loading");
      throw error;
    }
  }, [address]);

  useEffect(() => {
    if (!ready || !address) return;

    let retry: ReturnType<typeof setTimeout>;
    refresh().catch(() => {
      retry = setTimeout(() => setAttempt((n) => n + 1), 1500);
    });

    return () => clearTimeout(retry);
  }, [ready, address, refresh, attempt]);

  /** Claim a handle. Sponsored, so it costs the user nothing. */
  const claim = useCallback(
    async (desired: string) => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.registry,
          data: encodeFunctionData({
            abi: koloRegistryAbi,
            functionName: "register",
            args: [desired],
          }),
        },
      ]);

      setHandle(desired);
      setStatus("registered");
    },
    [client]
  );

  return { handle, status, refresh, claim };
}

/** Live availability check used by the handle picker. */
export async function checkHandleAvailable(candidate: string): Promise<boolean> {
  return getPublicClient().readContract({
    address: config.contracts.registry,
    abi: koloRegistryAbi,
    functionName: "isAvailable",
    args: [candidate],
  });
}

/** Resolve a handle to an account, or null when nobody has claimed it. */
export async function resolveHandle(candidate: string): Promise<`0x${string}` | null> {
  const resolved = await getPublicClient().readContract({
    address: config.contracts.registry,
    abi: koloRegistryAbi,
    functionName: "resolve",
    args: [candidate],
  });

  return resolved === "0x0000000000000000000000000000000000000000" ? null : resolved;
}
