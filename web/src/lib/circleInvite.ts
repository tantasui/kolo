/**
 * Circle invite links.
 *
 * The code in the fragment is a short encoding of the circle's id, and it is
 * **not a secret**. Any forming circle can be joined by anyone who knows its
 * id, because the contract puts no gate on `join` -- the link is a convenient
 * way to hand someone the circle, not a permission to enter it. It rides in
 * the fragment for the same reason the claim-link secret does (fragments never
 * reach a server), but nothing here depends on it staying private.
 *
 * If invite-only circles are wanted later, that is a contract change: an
 * allowlist or a signature, not a longer code.
 */

/** Circle id -> the code that goes after the `#`. */
export function encodeInvite(circleId: bigint): string {
  return circleId.toString(36);
}

/** Read a circle id back out of an invite fragment, or null if malformed. */
export function decodeInvite(fragment: string): bigint | null {
  const raw = fragment.replace(/^#/, "").trim().toLowerCase();
  if (!/^[0-9a-z]{1,12}$/.test(raw)) return null;

  let value = 0n;
  for (const char of raw) {
    const digit = BigInt(parseInt(char, 36));
    if (Number.isNaN(Number(digit))) return null;
    value = value * 36n + digit;
  }

  return value > 0n ? value : null;
}

/** The shareable URL for a circle. */
export function buildInviteUrl(circleId: bigint, origin?: string): string {
  const base = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  return `${base}/circle/join#${encodeInvite(circleId)}`;
}

/**
 * How often a round comes round, from its length in seconds.
 * Said the way a person would say it, never as a duration.
 */
export function frequencyLabel(seconds: number): string {
  const days = Math.round(seconds / 86400);
  if (days >= 28 && days <= 31) return "every month";
  if (days === 14) return "every two weeks";
  if (days === 7) return "every week";
  if (days >= 1) return `every ${days} days`;

  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return hours === 1 ? "every hour" : `every ${hours} hours`;
  return `every ${Math.max(1, Math.round(seconds / 60))} minutes`;
}
