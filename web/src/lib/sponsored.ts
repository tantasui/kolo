import type { SmartAccountClient } from "permissionless";

export interface Call {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
}

/**
 * Submit one sponsored user operation and resolve once it is on chain.
 *
 * Batching matters: an approve followed by a payment is a single operation
 * here, so a send is one tap rather than two confirmations. `SmartAccountClient`
 * is only loosely typed for the batched `calls` form, so the cast is confined
 * to this one helper.
 */
export async function sendSponsored(client: SmartAccountClient, calls: Call[]): Promise<`0x${string}`> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).sendTransaction({ calls });
}
