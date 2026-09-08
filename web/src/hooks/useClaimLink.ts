"use client";

import { useCallback } from "react";
import { encodeFunctionData, type Hex } from "viem";
import { erc20Abi } from "@/abi/erc20";
import { koloLinksAbi } from "@/abi/koloLinks";
import { config } from "@/config";
import { buildClaimUrl, createSecret, hashSecret } from "@/lib/claimLink";
import { sendSponsored } from "@/lib/sponsored";
import { getPublicClient } from "./usePublicClient";
import { useSmartWallet } from "./useSmartWallet";

export interface CreatedLink {
  /** The URL to hand over. Carries the secret in its fragment. */
  url: string;
  secret: Hex;
  secretHash: Hex;
  amount: bigint;
}

/** What the claim page found behind a link's secret. */
export type LinkLookup =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "gone" }
  | { kind: "expired"; amount: bigint }
  | { kind: "ready"; amount: bigint; secret: Hex; expiresAt: number };

/** Read a link without spending anything. Works signed out. */
export async function lookUpLink(secret: Hex): Promise<LinkLookup> {
  if (!config.features.claimLinks) return { kind: "invalid" };

  const secretHash = hashSecret(secret);
  const client = getPublicClient();

  const link = await client.readContract({
    address: config.contracts.links,
    abi: koloLinksAbi,
    functionName: "linkOf",
    args: [secretHash],
  });

  // A cleared row means it was claimed or the sender took it back. Both look
  // the same on chain, and to the person holding the link they mean the same
  // thing: there is nothing here for you.
  if (link.amount === 0n) return { kind: "gone" };

  const expiresAt = Number(link.expiresAt);
  if (Date.now() / 1000 >= expiresAt) return { kind: "expired", amount: link.amount };

  return { kind: "ready", amount: link.amount, secret, expiresAt };
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

      // A call to an address holding no code succeeds silently on the EVM, so a
      // wrong or stale NEXT_PUBLIC_KOLO_LINKS_ADDRESS would produce a user
      // operation that "worked" while parking nothing -- and we would hand over
      // a link with no money behind it. Read the link back before believing it.
      const live = await getPublicClient().readContract({
        address: config.contracts.links,
        abi: koloLinksAbi,
        functionName: "isLive",
        args: [secretHash],
      });

      if (!live) throw new Error("link was not created on chain");

      return { url: buildClaimUrl(secret), secret, secretHash, amount };
    },
    [client]
  );

  return { create };
}

/** Claim a link into the signed-in account, sponsored. */
export function useClaimLink() {
  const { client, address } = useSmartWallet();

  const claim = useCallback(
    async (secret: Hex) => {
      if (!client || !address) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.links,
          data: encodeFunctionData({
            abi: koloLinksAbi,
            functionName: "claim",
            args: [secret, address],
          }),
        },
      ]);
    },
    [client, address]
  );

  return { claim };
}

/** Cancel a link you created and take the money back, sponsored. */
export function useCancelLink() {
  const { client } = useSmartWallet();

  const cancel = useCallback(
    async (secretHash: Hex) => {
      if (!client) throw new Error("account not ready");

      await sendSponsored(client, [
        {
          to: config.contracts.links,
          data: encodeFunctionData({
            abi: koloLinksAbi,
            functionName: "reclaim",
            args: [secretHash],
          }),
        },
      ]);
    },
    [client]
  );

  return { cancel };
}
