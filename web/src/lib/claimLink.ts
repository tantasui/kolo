import { keccak256, type Hex } from "viem";

/**
 * Claim links: money parked behind a secret so it can be sent to someone who
 * has no handle yet.
 *
 * The secret is generated here, on the sender's device, and lives in the URL
 * **fragment**. Browsers never put a fragment in the request line, so it does
 * not reach our host, a CDN, or a server log -- only the chain's `keccak256` of
 * it is ever published. Whoever holds the link holds the money, exactly like
 * cash, which is why the fragment must never be logged or sent anywhere.
 */

/** Bytes of entropy behind a link. 32 is the width the contract stores. */
const SECRET_BYTES = 32;

/** A generated secret, and the hash the contract parks the money behind. */
export interface LinkSecret {
  /** 0x-prefixed 32 bytes. Never send this anywhere but the recipient. */
  secret: Hex;
  /** keccak256(secret) -- the only half that goes on chain. */
  secretHash: Hex;
}

function toHex(bytes: Uint8Array): Hex {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return `0x${out}`;
}

/**
 * 32 fresh bytes from the platform CSPRNG, and their hash.
 *
 * `crypto.getRandomValues` is required rather than preferred: `Math.random` is
 * not seeded for secrecy, and this value alone can spend the money.
 */
export function createSecret(): LinkSecret {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("secure randomness unavailable");
  }

  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);

  const secret = toHex(bytes);
  return { secret, secretHash: hashSecret(secret) };
}

/**
 * The hash the contract keys a link by.
 *
 * Must match `keccak256(abi.encodePacked(secret))` on chain: both hash the raw
 * 32 bytes. `KoloLinks.hashOf` exists so a client can check this agrees before
 * committing any money.
 */
export function hashSecret(secret: Hex): Hex {
  return keccak256(secret);
}

/**
 * The shareable URL. The secret sits after the `#`, so it stays on the device
 * of whoever opens it.
 */
export function buildClaimUrl(secret: Hex, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/claim#${secret.slice(2)}`;
}

/** Read a secret back out of a claim URL's fragment, or null if malformed. */
export function readSecretFromFragment(fragment: string): Hex | null {
  const raw = fragment.replace(/^#/, "").trim();
  return /^[0-9a-fA-F]{64}$/.test(raw) ? (`0x${raw.toLowerCase()}` as Hex) : null;
}
