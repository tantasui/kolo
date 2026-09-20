import { decodeInvite, encodeInvite } from "./circleInvite";

/**
 * Pot invite links.
 *
 * Same codec as circle invites -- a short base-36 encoding of the id, in the
 * fragment -- and the same caveat: it is **not a secret**. `join` has no gate,
 * so the link hands somebody the pot rather than permitting them to enter it.
 *
 * Unlike a circle, nothing needs protecting here. Whoever joins a pot can only
 * ever spend money they put in themselves, so an open door costs the existing
 * members nothing. That difference is why circles should one day be invite-only
 * and pots need not be.
 */
export function buildPotInviteUrl(potId: bigint, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/pot/join#${encodeInvite(potId)}`;
}

/** Read a pot id back out of an invite fragment, or null if malformed. */
export const decodePotInvite = decodeInvite;
