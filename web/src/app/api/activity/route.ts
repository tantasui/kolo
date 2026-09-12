import { NextResponse } from "next/server";
import { config } from "@/config";

/**
 * Envio HyperSync, proxied.
 *
 * HyperSync needs an API token and the browser must never hold one: a token in
 * `NEXT_PUBLIC_*` is readable by anyone who opens the page, and it is rate
 * limited and attributable to us. So the token lives here, server side, and the
 * client asks this route instead.
 *
 * The client sends only a block range. **It does not get to choose what is
 * queried** -- the contract addresses come from our own config on this side of
 * the wire. Letting the caller name addresses would turn this into an open
 * HyperSync proxy paid for with our token.
 */

const ENDPOINT = process.env.ENVIO_HYPERSYNC_URL || "https://monad-testnet.hypersync.xyz";
const TOKEN = process.env.ENVIO_API_TOKEN || "";

/**
 * Whether the fast feed is available, and how far it has indexed.
 *
 * The height is the honest ceiling for this source: asking for blocks past it
 * returns nothing, so the store pages up to this rather than to the chain head.
 * `/height` needs no token, but it is reported from here anyway so the client
 * has one place to ask and no reason to know where HyperSync lives.
 */
export async function GET() {
  if (!TOKEN) return NextResponse.json({ available: false, height: 0 });

  try {
    const response = await fetch(`${ENDPOINT}/height`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ available: false, height: 0 });
    const { height } = await response.json();
    return NextResponse.json({ available: true, height: Number(height) || 0 });
  } catch (error) {
    console.error("[kolo] hypersync height failed", error);
    return NextResponse.json({ available: false, height: 0 });
  }
}

export async function POST(request: Request) {
  if (!TOKEN) {
    return NextResponse.json({ error: "hypersync not configured" }, { status: 503 });
  }

  let fromBlock: number;
  let toBlock: number;
  try {
    const body = await request.json();
    fromBlock = Number(body.fromBlock);
    toBlock = Number(body.toBlock);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!Number.isFinite(fromBlock) || !Number.isFinite(toBlock) || toBlock < fromBlock) {
    return NextResponse.json({ error: "bad block range" }, { status: 400 });
  }

  // Fixed on this side: the three contracts whose logs the feed is made of.
  const addresses = [config.contracts.pay, config.contracts.links, config.contracts.circle].filter(
    (address) => address !== "0x"
  );

  try {
    const response = await fetch(`${ENDPOINT}/query`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        from_block: fromBlock,
        to_block: toBlock + 1, // HyperSync's to_block is exclusive.
        logs: [{ address: addresses }],
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
    return NextResponse.json({ logs, nextBlock: payload.next_block ?? toBlock + 1 });
  } catch (error) {
    console.error("[kolo] hypersync request failed", error);
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
