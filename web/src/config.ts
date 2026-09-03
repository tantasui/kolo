import { defineChain } from "viem";
import { monadTestnet } from "viem/chains";

/**
 * Single source of truth for every network parameter, contract address and
 * API key in the app. Nothing here is hardcoded at a call site.
 *
 * Values come from `.env.local`; see `.env.example` for the full list.
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only when it is
 * written out literally, hence the repetition below.
 */

const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const BUNDLER_URL = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL || "";
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const PRIVY_CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || "";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS || "";
const PAY_ADDRESS = process.env.NEXT_PUBLIC_KOLO_PAY_ADDRESS || "";
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TEST_USD_ADDRESS || "";

/** Block the contracts were deployed at. Bounds how far back we ever scan. */
const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_KOLO_DEPLOY_BLOCK || "0";

/** Monad Testnet, with the RPC endpoint overridable per environment. */
export const chain = defineChain({
  ...monadTestnet,
  rpcUrls: { default: { http: [RPC_URL] } },
});

function asAddress(value: string): `0x${string}` {
  return (/^0x[0-9a-fA-F]{40}$/.test(value) ? value : "0x") as `0x${string}`;
}

export const config = {
  chain,
  rpcUrl: RPC_URL,
  bundlerUrl: BUNDLER_URL,

  privy: {
    appId: PRIVY_APP_ID,
    /** Optional; Privy accepts undefined but not an empty string. */
    clientId: PRIVY_CLIENT_ID || undefined,
  },

  contracts: {
    registry: asAddress(REGISTRY_ADDRESS),
    pay: asAddress(PAY_ADDRESS),
    /** The dollar balance users hold. Swap for Agora AUSD by changing this. */
    token: asAddress(TOKEN_ADDRESS),
  },

  /**
   * Internal token facts. The symbol is never rendered -- balances are shown
   * as plain dollars -- but the decimals drive every amount conversion.
   */
  token: {
    decimals: 6,
    symbol: "tUSD",
  },

  deployBlock: BigInt(DEPLOY_BLOCK),

  handle: {
    minLength: 3,
    maxLength: 20,
    /** Mirrors KoloRegistry._isValidHandle exactly. */
    pattern: /^[a-z0-9_]{3,20}$/,
  },

  /** Bound on memo length, mirroring KoloPay.MAX_MEMO_BYTES. */
  maxNoteBytes: 200,

  activity: {
    /** Monad's public RPC caps eth_getLogs at a 100-block span. */
    maxLogRange: 100n,
    /** How often to sweep for incoming payments, in ms. */
    pollIntervalMs: 4000,
    /** Cap on catch-up windows after the app has been closed a while. */
    maxBackfillWindows: 20,
  },
} as const;

/** Env vars that must be set for the app to function, with friendly labels. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!PRIVY_APP_ID) missing.push("NEXT_PUBLIC_PRIVY_APP_ID");
  if (!BUNDLER_URL) missing.push("NEXT_PUBLIC_PIMLICO_BUNDLER_URL");
  if (config.contracts.registry === "0x") missing.push("NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS");
  if (config.contracts.pay === "0x") missing.push("NEXT_PUBLIC_KOLO_PAY_ADDRESS");
  if (config.contracts.token === "0x") missing.push("NEXT_PUBLIC_TEST_USD_ADDRESS");
  return missing;
}
