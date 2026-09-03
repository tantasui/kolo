"use client";

import { useMemo } from "react";
import { createPublicClient, http, type PublicClient } from "viem";
import { config } from "@/config";

let shared: PublicClient | null = null;

/** One read-only client for the whole app. */
export function getPublicClient(): PublicClient {
  if (!shared) {
    shared = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    }) as PublicClient;
  }
  return shared;
}

export function usePublicClient(): PublicClient {
  return useMemo(() => getPublicClient(), []);
}
