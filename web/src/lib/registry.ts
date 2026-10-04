import { koloRegistryAbi } from "@/abi/koloRegistry";
import { config } from "@/config";
import { getPublicClient } from "@/hooks/usePublicClient";

/**
 * Reads of the handle registry that need nothing but an RPC endpoint.
 *
 * They live here rather than in `useHandle` because that module reaches the
 * smart account, and through it Privy and the bundler. Anything that only wants
 * to ask the registry a question -- the handle field on `/about`, for one --
 * should not drag sign-in into its bundle to do it.
 */

/** Is this handle free? Mirrors KoloRegistry.isAvailable. */
export async function checkHandleAvailable(
  candidate: string,
): Promise<boolean> {
  return getPublicClient().readContract({
    address: config.contracts.registry,
    abi: koloRegistryAbi,
    functionName: "isAvailable",
    args: [candidate],
  });
}

/** Resolve a handle to an account, or null when nobody has claimed it. */
export async function resolveHandle(
  candidate: string,
): Promise<`0x${string}` | null> {
  const resolved = await getPublicClient().readContract({
    address: config.contracts.registry,
    abi: koloRegistryAbi,
    functionName: "resolve",
    args: [candidate],
  });

  return resolved === "0x0000000000000000000000000000000000000000"
    ? null
    : resolved;
}
