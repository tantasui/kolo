"use client";

import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { koloPayAbi } from "@/abi/koloPay";
import { testUsdAbi } from "@/abi/testUsd";
import { config } from "@/config";
import { sendSponsored } from "@/lib/sponsored";
import { useSmartWallet } from "./useSmartWallet";

export interface SendRequest {
  handle: string;
  amount: bigint;
  note: string;
}

export function useSendPayment() {
  const { client } = useSmartWallet();

  /**
   * One sponsored operation containing both the allowance and the payment,
   * so the user taps once and is never asked to confirm anything.
   */
  const send = useCallback(
    async ({ handle, amount, note }: SendRequest) => {
      if (!client) throw new Error("account not ready");

      return sendSponsored(client, [
        {
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: testUsdAbi,
            functionName: "approve",
            args: [config.contracts.pay, amount],
          }),
        },
        {
          to: config.contracts.pay,
          data: encodeFunctionData({
            abi: koloPayAbi,
            functionName: "sendToHandle",
            args: [handle, config.contracts.token, amount, note],
          }),
        },
      ]);
    },
    [client]
  );

  return { send };
}
