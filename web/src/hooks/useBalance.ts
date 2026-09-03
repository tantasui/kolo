"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeFunctionData } from "viem";
import { testUsdAbi } from "@/abi/testUsd";
import { config } from "@/config";
import { sendSponsored } from "@/lib/sponsored";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

export function useBalance() {
  const { address, ready, client } = useSmartWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const addressRef = useRef(address);
  addressRef.current = address;

  const refresh = useCallback(async () => {
    const account = addressRef.current;
    if (!account) return;

    try {
      const value = await getPublicClient().readContract({
        address: config.contracts.token,
        abi: testUsdAbi,
        functionName: "balanceOf",
        args: [account],
      });
      setBalance(value);
    } catch (error) {
      console.error("[kolo] could not read balance", error);
    }
  }, []);

  useEffect(() => {
    if (!ready || !address) {
      setBalance(null);
      return;
    }

    void refresh();
    const timer = setInterval(() => void refresh(), config.activity.pollIntervalMs);
    return () => clearInterval(timer);
  }, [ready, address, refresh]);

  /** "Add demo funds" -- draws from the faucet, sponsored. */
  const addMoney = useCallback(async () => {
    if (!client) throw new Error("account not ready");

    await sendSponsored(client, [
      {
        to: config.contracts.token,
        data: encodeFunctionData({ abi: testUsdAbi, functionName: "faucet" }),
      },
    ]);

    await refresh();
  }, [client, refresh]);

  return { balance, refresh, addMoney };
}
