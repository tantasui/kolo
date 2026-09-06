"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { encodeFunctionData } from "viem";
import { erc20Abi } from "@/abi/erc20";
import { koloFaucetAbi } from "@/abi/koloFaucet";
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
        abi: erc20Abi,
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

  /**
   * "Add demo funds" -- one sponsored call to our faucet.
   *
   * `drip` takes the recipient as an argument rather than paying its caller,
   * so the user's own account asks for its own opening balance and nothing
   * needs a relayer.
   */
  const addMoney = useCallback(async () => {
    if (!client) throw new Error("account not ready");
    const account = addressRef.current;
    if (!account) throw new Error("account not ready");

    await sendSponsored(client, [
      {
        to: config.contracts.faucet,
        data: encodeFunctionData({
          abi: koloFaucetAbi,
          functionName: "drip",
          args: [account],
        }),
      },
    ]);

    await refresh();
  }, [client, refresh]);

  return { balance, refresh, addMoney };
}
