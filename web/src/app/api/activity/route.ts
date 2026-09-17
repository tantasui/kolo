import { NextResponse } from "next/server";
import type { Hex } from "viem";
import {
  buildLogSelections,
  isAddressLike,
  isHash32,
  MAX_LINK_HASHES,
} from "@/lib/activity/hyperSyncQuery";
import { callerKey, createRateLimiter } from "@/lib/rateLimit";

/**
 * Envio HyperSync, proxied.
 *
 * HyperSync needs an API token and the browser must never hold one: a token in
 * `NEXT_PUBLIC_*` is readable by anyone who opens the page, and it is rate
 * limited and attributable to us. So the token lives here and the client asks
 * this route instead.
 *
 * **What the client may and may not decide.** It sends a block range, its own
 * account, and the link hashes it already knows about. All three can only
 * narrow the query. The contract addresses are fixed on this side, so the route
 * cannot be pointed at anything but Kolo's own contracts — otherwise it would
 * be an open HyperSync proxy paid for with our token.
 *
 * Nothing returned here is private. These logs are on a public chain and anyone
 * with an RPC URL can read them without us. The filtering is so that a phone
 * downloads its own rows instead of everybody's, and the address pinning is to
 * protect the token, not the data.
 */

const ENDPOINT = process.env.ENVIO_HYPERSYNC_URL || "https://monad-testnet.hypersync.xyz";
const TOKEN = process.env.ENVIO_API_TOKEN || "";

/**
 * Sized from what the client actually does, not picked round.
 *
 *   burst    a first sync reads from the deploy block to the head in 50k-block
 *            windows -- about 50 requests back to back today, and growing with
 *            the chain. Capacity has to clear that or a new device never
 *            finishes its first sweep.
 *   steady   the store sweeps every 4s and spends two requests doing it (a
 *            height check and one window), so ~0.5/s per open tab. Two tabs
 *            and a second device is ~1.5/s, so 2/s leaves room without being
 *            a licence to grind.
 *
 * See lib/rateLimit.ts for what this does and does not promise.
 */
const limiter = createRateLimiter({ capacity: 150, refillPerSecond: 2 });

/** One request cannot ask for more than the client's own paging window. */
const MAX_SPAN = 100_000;

/**
 * The head, briefly memoised across callers.
 *
 * Every open tab asks for this on every sweep, and the answer is the same for
 * all of them. Monad blocks are ~400ms, so a couple of seconds of staleness
 * costs the feed nothing and turns N tabs into one upstream call.
 */
let heightCache: { value: number; at: number } = { value: 0, at: 0 };
const HEIGHT_TTL_MS = 2_000;

async function currentHeight(): Promise<number> {
  const now = Date.now();
  if (heightCache.value > 0 && now - heightCache.at < HEIGHT_TTL_MS) return heightCache.value;

  const response = await fetch(`${ENDPOINT}/height`, { cache: "no-store" });
  if (!response.ok) throw new Error(`height ${response.status}`);

  const { height } = await response.json();
  heightCache = { value: Number(height) || 0, at: now };
  return heightCache.value;
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "too many requests" },
    { status: 429, headers: { "retry-after": String(retryAfter) } }
  );
}

/**
 * Whether the fast feed is available, and how far it has indexed.
 *
 * The height is the honest ceiling for this source: asking for blocks past it
 * returns nothing, so the store pages up to this rather than to the chain head.
 */
export async function GET(request: Request) {
  const limit = limiter.check(callerKey(request.headers));
  if (!limit.ok) return tooMany(limit.retryAfter);

  if (!TOKEN) return NextResponse.json({ available: false, height: 0 });

  try {
    return NextResponse.json({ available: true, height: await currentHeight() });
  } catch (error) {
    console.error("[kolo] hypersync height failed", error);
    return NextResponse.json({ available: false, height: 0 });
  }
}

export async function POST(request: Request) {
  const limit = limiter.check(callerKey(request.headers));
  if (!limit.ok) return tooMany(limit.retryAfter);

  // Validate before checking configuration. A malformed request is malformed
  // whether or not we hold a token, and answering 503 to it would tell the
  // caller the wrong thing -- and leave these guards unreachable, so untestable,
  // on any deployment without one.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { fromBlock, toBlock, account, linkHashes } = (body ?? {}) as {
    fromBlock?: unknown;
    toBlock?: unknown;
    account?: unknown;
    linkHashes?: unknown;
  };

  const from = Number(fromBlock);
  const to = Number(toBlock);

  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) {
    return NextResponse.json({ error: "bad block range" }, { status: 400 });
  }
  if (to - from > MAX_SPAN) {
    return NextResponse.json({ error: `range exceeds ${MAX_SPAN} blocks` }, { status: 400 });
  }
  if (!isAddressLike(account)) {
    return NextResponse.json({ error: "bad account" }, { status: 400 });
  }

  // Anything malformed is dropped rather than rejected: a stale cached row with
  // a bad hash should cost the caller that one filter, not the whole sweep.
  const hashes = (Array.isArray(linkHashes) ? linkHashes : [])
    .filter(isHash32)
    .slice(0, MAX_LINK_HASHES) as Hex[];

  if (!TOKEN) {
    return NextResponse.json({ error: "hypersync not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${ENDPOINT}/query`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        from_block: from,
        to_block: to + 1, // HyperSync's to_block is exclusive.
        logs: buildLogSelections(account, hashes),
        field_selection: {
          log: [
            "block_number",
            "transaction_hash",
            "log_index",
            "address",
            "data",
            "topic0",
            "topic1",
            "topic2",
            "topic3",
          ],
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[kolo] hypersync rejected the query", response.status, detail.slice(0, 200));
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const payload = await response.json();
    const logs = (payload.data ?? []).flatMap((block: { logs?: unknown[] }) => block.logs ?? []);

    // `next_block` is how HyperSync says it stopped early; the caller resumes there.
    return NextResponse.json({ logs, nextBlock: payload.next_block ?? to + 1 });
  } catch (error) {
    console.error("[kolo] hypersync request failed", error);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}

/** Block range and filters are per-request, so nothing here may be cached. */
export const dynamic = "force-dynamic";
