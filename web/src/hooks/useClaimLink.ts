"use client";

import { useCallback } from "react";
import { encodeFunctionData, type Hex } from "viem";
import { erc20Abi } from "@/abi/erc20";
import { koloLinksAbi } from "@/abi/koloLinks";
import { config } from "@/config";
import { buildClaimUrl, createSecret } from "@/lib/claimLink";
import { sendSponsored } from "@/lib/sponsored";
import { useSmartWallet } from "./useSmartWallet";

export interface CreatedLink {
  /** The URL to hand over. Carries the secret in its fragment. */
  url: string;
  secret: Hex;
  secretHash: Hex;
  amount: bigint;
}

export function useCreateClaimLink() {
  const { client } = useSmartWallet();

  /**
   * Park an amount behind a fresh secret, in one sponsored operation.
   *
   * The allowance and the creation go out batched, so the user taps once and
   * confirms nothing -- the same shape as a send. The secret is generated here
   * and never leaves the device except inside the returned URL's fragment.
   */
  const create = useCallback(
    async ({ amount, note }: { amount: bigint; note: string }): Promise<CreatedLink> => {
      if (!client) throw new Error("account not ready");
      if (!config.features.claimLinks) throw new Error("claim links are not configured");

      const { secret, secretHash } = createSecret();

      await sendSponsored(client, [
        {
          to: config.contracts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [config.contracts.links, amount],
          }),
        },
        {
          to: config.contracts.links,
          data: encodeFunctionData({
            abi: koloLinksAbi,
            functionName: "create",
            args: [secretHash, config.contracts.token, amount, note],
          }),
        },
      ]);

      return { url: buildClaimUrl(secret), secret, secretHash, amount };
    },
    [client]
  );

  return { create };
}
