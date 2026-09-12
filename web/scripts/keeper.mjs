/**
 * The crank that closes circle rounds when nobody is looking.
 *
 * A round is closed by `payout`, which anybody may call once the deadline has
 * passed -- or sooner, the moment everyone has put their contribution in. That
 * is deliberate: the circle can always be moved along by whoever cares,
 * including a member from the app, so it can never be stuck waiting on
 * infrastructure. This process is just the party who always cares.
 *
 * It holds no privilege. Losing it costs punctuality, not money.
 *
 * Chainlink Automation would be the obvious home for this and is not an
 * option: it has never supported Monad, and the product itself sunset in
 * mid-2026 in favour of CRE, which covers the same chains. See the README.
 *
 *   cd web && npm run keeper            # every 30s, forever
 *   cd web && npm run keeper -- --once  # one sweep, then exit
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const here = dirname(fileURLToPath(import.meta.url));

/** Read a KEY=value file the way Next reads .env.local, ignoring what is absent. */
function readEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "").split(" #")[0].trim();
    }
  } catch {
    // A missing file is fine; the other one may carry everything needed.
  }
  return out;
}

const env = {
  ...readEnv(resolve(here, "../../contracts/.env")),
  ...readEnv(resolve(here, "../.env.local")),
  ...process.env,
};

const RPC_URL = env.NEXT_PUBLIC_MONAD_RPC_URL || env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const CIRCLE = env.NEXT_PUBLIC_KOLO_CIRCLE_ADDRESS || "0xCCABe852918A81d909dbE303Ee18F09Ad31111AD";
const KEY = env.KEEPER_PRIVATE_KEY || env.PRIVATE_KEY;

const INTERVAL_MS = Number(env.KEEPER_INTERVAL_MS || 30_000);
const ONCE = process.argv.includes("--once");

if (!KEY) {
  console.error(
    "No key to send with. Set PRIVATE_KEY in contracts/.env (or KEEPER_PRIVATE_KEY).\n" +
      "It only pays for the calls -- the crank has no power over a circle."
  );
  process.exit(1);
}

const chain = defineChain({ ...monadTestnet, rpcUrls: { default: { http: [RPC_URL] } } });
const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

const abi = [
  { type: "function", name: "circleCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "circleOf",
    stateMutability: "view",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "contribution", type: "uint256" },
          { name: "size", type: "uint8" },
          { name: "joined", type: "uint8" },
          { name: "round", type: "uint8" },
          { name: "paidOut", type: "uint8" },
          { name: "roundEndsAt", type: "uint64" },
          { name: "roundDuration", type: "uint64" },
          { name: "createdAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "name", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "collectedThisRound",
    stateMutability: "view",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "payout",
    stateMutability: "nonpayable",
    inputs: [{ name: "circleId", type: "uint256" }],
    outputs: [],
  },
];

const RUNNING = 1;
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (message) => console.log(`${stamp()}  ${message}`);

/** Close every round that is ready, and say why the others are not. */
async function sweep() {
  const count = await publicClient.readContract({ address: CIRCLE, abi, functionName: "circleCount" });
  if (count === 0n) {
    log("no circles yet");
    return;
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  let closed = 0;

  for (let id = 1n; id <= count; id += 1n) {
    const circle = await publicClient.readContract({
      address: CIRCLE,
      abi,
      functionName: "circleOf",
      args: [id],
    });
    if (circle.status !== RUNNING) continue;

    const collected = await publicClient.readContract({
      address: CIRCLE,
      abi,
      functionName: "collectedThisRound",
      args: [id],
    });
    const everyoneIn = collected === BigInt(circle.size) * circle.contribution;
    const pastDeadline = now >= circle.roundEndsAt;
    if (!everyoneIn && !pastDeadline) {
      const left = Number(circle.roundEndsAt - now);
      log(`#${id} "${circle.name}" round ${circle.round + 1}: ${Math.ceil(left / 60)}m left`);
      continue;
    }

    // Simulate first. A round whose members are all short has nobody the
    // circle can afford to pay, and that is a state to report, not an error
    // to crash on -- it clears itself when somebody contributes or cures.
    try {
      await publicClient.simulateContract({
        address: CIRCLE,
        abi,
        functionName: "payout",
        args: [id],
        account,
      });
    } catch (error) {
      const reason = String(error).includes("NoEligibleRecipient")
        ? "nobody has posted enough to hold the pot yet"
        : String(error).split("\n")[0];
      log(`#${id} "${circle.name}" round ${circle.round + 1}: waiting — ${reason}`);
      continue;
    }

    const hash = await walletClient.writeContract({
      address: CIRCLE,
      abi,
      functionName: "payout",
      args: [id],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    closed += 1;
    log(
      `#${id} "${circle.name}" round ${circle.round + 1} paid out ` +
        `(${everyoneIn ? "everyone in" : "deadline"}, block ${receipt.blockNumber})`
    );
  }

  if (closed === 0) log("nothing ready");
}

const balance = await publicClient.getBalance({ address: account.address });
log(`keeper ${account.address} — ${formatUnits(balance, 18).slice(0, 6)} MON`);
log(`watching ${CIRCLE}`);

await sweep();

if (!ONCE) {
  log(`sweeping every ${INTERVAL_MS / 1000}s — ctrl-c to stop`);
  setInterval(() => {
    sweep().catch((error) => log(`sweep failed: ${String(error).split("\n")[0]}`));
  }, INTERVAL_MS);
}
