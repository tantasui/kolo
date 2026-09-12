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

/**
 * The live Monad Testnet deployment. Recorded here so a fresh clone runs
 * against real contracts with nothing to deploy; set the matching env vars
 * to point at your own.
 */
const DEPLOYED = {
  registry: "0xa4d9181bc7740d63df4783ff2c60ebb84f413212",
  pay: "0x99278ba6c5b64c72862c678b38c25a3c7cf59547",
  /** Agora AUSD on Monad Testnet. */
  token: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
  /** Our own faucet, stocked with AUSD. See KoloFaucet.sol for why. */
  faucet: "0xc656E6c73752C0e0bf57b1CD7822293c5E69570F",
  /** Escrow behind claim links. */
  links: "0xf4bde27146E8937aCEa9a39501E891Ed4a3C956D",
  /** Runs ajo circles. */
  circle: "0xCCABe852918A81d909dbE303Ee18F09Ad31111AD",
  block: "59479502",
};

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS || DEPLOYED.registry;
const PAY_ADDRESS = process.env.NEXT_PUBLIC_KOLO_PAY_ADDRESS || DEPLOYED.pay;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || DEPLOYED.token;
const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_KOLO_FAUCET_ADDRESS || DEPLOYED.faucet;
const LINKS_ADDRESS = process.env.NEXT_PUBLIC_KOLO_LINKS_ADDRESS || DEPLOYED.links;
const CIRCLE_ADDRESS = process.env.NEXT_PUBLIC_KOLO_CIRCLE_ADDRESS || DEPLOYED.circle;

/** Block the contracts were deployed at. Bounds how far back we ever scan. */
const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_KOLO_DEPLOY_BLOCK || DEPLOYED.block;

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
    /**
     * The dollar balance users hold: Agora AUSD. Changing this one address is
     * the whole token swap, as long as the new token's decimals match
     * `token.decimals` below.
     */
    token: asAddress(TOKEN_ADDRESS),
    /** Hands demo users their opening balance. */
    faucet: asAddress(FAUCET_ADDRESS),
    /** Parks money behind a secret, for claim links. "0x" when unconfigured. */
    links: asAddress(LINKS_ADDRESS),
    /** Runs ajo circles. "0x" when unconfigured. */
    circle: asAddress(CIRCLE_ADDRESS),
  },

  /**
   * Flags for work that needs a contract we have not deployed everywhere.
   * The UI reads these rather than testing addresses at a call site.
   */
  features: {
    /** Claim links appear in the send flow only once KoloLinks is configured. */
    claimLinks: asAddress(LINKS_ADDRESS) !== "0x",
    /** Circles appear only once KoloCircle is configured. */
    circles: asAddress(CIRCLE_ADDRESS) !== "0x",
  },

  /**
   * Internal token facts. The symbol is never rendered -- balances are shown
   * as plain dollars -- but the decimals drive every amount conversion, so
   * this must match the configured token's own `decimals()`.
   * AUSD and TestUSD are both 6.
   */
  token: {
    decimals: 6,
    symbol: "AUSD",
    displayName: "dollars",
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

  /**
   * Display-only FX. The balance is always dollars on chain; naira is a
   * presentation choice the user makes in Settings.
   *
   * Static on purpose: a demo should not depend on a rate feed being up, and
   * a fixed rate makes the conversion exactly reversible (see lib/currency.ts).
   * Read it through `getRate()` rather than reaching in here, so swapping in a
   * live feed later is one function body.
   */
  fx: {
    /** Naira per dollar. Matches the rate quoted in the README. */
    ngnPerUsd: 1615,
  },

  circles: {
    /** Mirrors KoloCircle.MAX_MEMBERS. */
    maxMembers: 8,
    minMembers: 2,
    /** Mirrors KoloCircle.MAX_NAME_BYTES. */
    maxNameBytes: 40,
    /** How close a deadline has to be before the app says something. */
    dueSoonSeconds: 24 * 60 * 60,
  },

  activity: {
    /** Monad's public RPC caps eth_getLogs at a 100-block span. */
    maxLogRange: 100n,
    /** How often to sweep for incoming payments, in ms. */
    pollIntervalMs: 4000,
    /** Cap on catch-up windows after the app has been closed a while. */
    maxBackfillWindows: 20,
  },
} as const;

/**
 * Naira per dollar, for display conversion only.
 *
 * The single accessor for the rate: everything that converts money goes
 * through here, so a live feed later means changing this body alone.
 */
export function getRate(): number {
  return config.fx.ngnPerUsd;
}

/** Env vars that must be set for the app to function, with friendly labels. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!PRIVY_APP_ID) missing.push("NEXT_PUBLIC_PRIVY_APP_ID");
  if (!BUNDLER_URL) missing.push("NEXT_PUBLIC_PIMLICO_BUNDLER_URL");
  if (config.contracts.registry === "0x") missing.push("NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS");
  if (config.contracts.pay === "0x") missing.push("NEXT_PUBLIC_KOLO_PAY_ADDRESS");
  if (config.contracts.token === "0x") missing.push("NEXT_PUBLIC_TOKEN_ADDRESS");
  if (config.contracts.faucet === "0x") missing.push("NEXT_PUBLIC_KOLO_FAUCET_ADDRESS");
  return missing;
}
