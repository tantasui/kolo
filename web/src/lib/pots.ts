import type { Address } from "viem";

/**
 * A pot is several ring-fenced shares behind one meter, not a shared purse.
 *
 * Every member has one row, and for each of them this holds at all times:
 *
 *     contributed = used + withdrawn + available
 *
 * Nothing anybody does touches another member's row. That is the whole design:
 * one person spending never reaches into what somebody else put in.
 */
export interface PotMember {
  account: Address;
  handle: string;
  isYou: boolean;
  /** Everything they have put in. */
  contributed: bigint;
  /** What they have spent on use. */
  used: bigint;
  /** What they have already taken back out. */
  withdrawn: bigint;
}

export type PotStatus = "open" | "closed";

export interface Pot {
  id: bigint;
  name: string;
  /** Cost of one unit of use. Fixed when the pot was made. */
  price: bigint;
  payee: Address;
  creator: Address;
  status: PotStatus;
  memberCount: number;
  /** Everything every member has used, ever. */
  used: bigint;
}

export interface PotDetail extends Pot {
  members: PotMember[];
  you?: PotMember;
  youAreCreator: boolean;
}

/**
 * What a member can take back: their own money, minus what they spent and what
 * they have already withdrawn.
 *
 * Mirrors `KoloPots._available`. Derived here rather than read per member so
 * one row cannot disagree with the figures printed beside it.
 */
export function availableOf(member: PotMember): bigint {
  const left = member.contributed - member.used - member.withdrawn;
  return left > 0n ? left : 0n;
}

/** What everybody together still has to spend or take back. */
export function totalAvailable(members: readonly PotMember[]): bigint {
  return members.reduce((sum, member) => sum + availableOf(member), 0n);
}

/**
 * The invariant, checked where it is displayed.
 *
 * Cheap, and it is the one claim the screen makes about somebody's money, so
 * it is worth knowing if a row ever stops adding up rather than rendering it.
 */
export function rowAddsUp(member: PotMember): boolean {
  return member.contributed === member.used + member.withdrawn + availableOf(member);
}

/** How many units of use a member's remaining share still covers. */
export function unitsLeft(member: PotMember, price: bigint): number {
  if (price <= 0n) return 0;
  return Number(availableOf(member) / price);
}
