/**
 * Proves the sponsored-transaction path works end to end on Monad Testnet.
 *
 * Privy's only job in the app is to produce a signer, so this stands in a
 * throwaway local key as the smart account's owner and exercises everything
 * downstream of it: account deployment, the paymaster, and the exact calls
 * the UI makes -- claim a handle, add demo funds, then a batched
 * approve + sendToHandle.
 *
 * The account never holds a single wei. If it finishes with a zero balance,
 * every operation was sponsored.
 *
 *   cd web && npm run verify:sponsorship
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, defineChain, encodeFunctionData, formatUnits, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { monadTestnet } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";

// Load web/.env.local the way Next does, so this runs with no extra setup.
for (const line of readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local"),
  "utf8"
).split("\n")) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const BUNDLER = process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL;
const RPC = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
// Defaults mirror web/src/config.ts, so this runs against the live deployment
// on a fresh clone exactly as the app does -- only the bundler URL is required.
const REGISTRY = process.env.NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS || "0xa4d9181bc7740d63df4783ff2c60ebb84f413212";
const PAY = process.env.NEXT_PUBLIC_KOLO_PAY_ADDRESS || "0x99278ba6c5b64c72862c678b38c25a3c7cf59547";
const TOKEN = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC";
const FAUCET = process.env.NEXT_PUBLIC_KOLO_FAUCET_ADDRESS || "0xc656E6c73752C0e0bf57b1CD7822293c5E69570F";
const RECIPIENT = process.env.KOLO_TEST_RECIPIENT || "kolo_test_b";

for (const [name, value] of Object.entries({ BUNDLER, REGISTRY, PAY, TOKEN, FAUCET })) {
  if (!value) throw new Error(`missing env for ${name}`);
}

const registryAbi = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "handle", type: "string" }], outputs: [] },
  { type: "function", name: "handleOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "string" }] },
  { type: "function", name: "isAvailable", stateMutability: "view", inputs: [{ name: "h", type: "string" }], outputs: [{ type: "bool" }] },
];
const tokenAbi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
];
// Our own faucet, not the token's: the dollar balance is Agora AUSD, whose
// supply we do not control, so KoloFaucet hands out a sane $100 from a reserve
// we top up. `drip` pays the address passed in, which is how a smart account
// funds itself in one sponsored call with no relayer.
const faucetAbi = [
  { type: "function", name: "drip", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }], outputs: [] },
];
const payAbi = [
  { type: "function", name: "sendToHandle", stateMutability: "nonpayable", inputs: [{ name: "handle", type: "string" }, { name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "memo", type: "string" }], outputs: [] },
];

const chain = defineChain({ ...monadTestnet, rpcUrls: { default: { http: [RPC] } } });
const publicClient = createPublicClient({ chain, transport: http(RPC) });

const owner = privateKeyToAccount(generatePrivateKey());
const account = await toKernelSmartAccount({
  client: publicClient,
  entryPoint: { address: entryPoint07Address, version: "0.7" },
  owners: [owner],
  version: "0.3.1",
});

const pimlico = createPimlicoClient({
  transport: http(BUNDLER),
  entryPoint: { address: entryPoint07Address, version: "0.7" },
});

const smart = createSmartAccountClient({
  account,
  chain,
  bundlerTransport: http(BUNDLER),
  paymaster: pimlico,
  userOperation: {
    estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
  },
});

const usd = (v) => `$${Number(formatUnits(v, 6)).toFixed(2)}`;
const gasBalance = () => publicClient.getBalance({ address: account.address });

console.log(`account   : ${account.address}`);
console.log(`gas held  : ${await gasBalance()} wei (expected 0)\n`);

// --- 1. claim a handle -------------------------------------------------
const handle = `kolo_v${Date.now().toString(36).slice(-6)}`;
console.log(`[1/3] claiming @${handle} …`);
let tx = await smart.sendTransaction({
  calls: [{ to: REGISTRY, data: encodeFunctionData({ abi: registryAbi, functionName: "register", args: [handle] }) }],
});
console.log(`      ok  ${tx}`);
const claimed = await publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: "handleOf", args: [account.address] });
console.log(`      handleOf(account) = "${claimed}"\n`);
if (claimed !== handle) throw new Error("handle was not registered");

// --- 2. add demo funds -------------------------------------------------
console.log("[2/3] adding demo funds …");
tx = await smart.sendTransaction({
  calls: [
    { to: FAUCET, data: encodeFunctionData({ abi: faucetAbi, functionName: "drip", args: [account.address] }) },
  ],
});
const funded = await publicClient.readContract({ address: TOKEN, abi: tokenAbi, functionName: "balanceOf", args: [account.address] });
console.log(`      ok  ${tx}`);
console.log(`      balance = ${usd(funded)}\n`);
if (funded === 0n) throw new Error("the faucet did not pay out");

// --- 3. batched approve + send, exactly as the UI does ------------------
const amount = 10_000000n;
console.log(`[3/3] sending ${usd(amount)} to @${RECIPIENT} in ONE batched operation …`);
const before = await publicClient.readContract({ address: TOKEN, abi: tokenAbi, functionName: "balanceOf", args: [account.address] });
tx = await smart.sendTransaction({
  calls: [
    { to: TOKEN, data: encodeFunctionData({ abi: tokenAbi, functionName: "approve", args: [PAY, amount] }) },
    { to: PAY, data: encodeFunctionData({ abi: payAbi, functionName: "sendToHandle", args: [RECIPIENT, TOKEN, amount, "verification"] }) },
  ],
});
const after = await publicClient.readContract({ address: TOKEN, abi: tokenAbi, functionName: "balanceOf", args: [account.address] });
console.log(`      ok  ${tx}`);
console.log(`      balance ${usd(before)} -> ${usd(after)}\n`);
if (before - after !== amount) throw new Error(`expected ${amount} to move, saw ${before - after}`);

const gasLeft = await gasBalance();
console.log(`gas held after 3 operations: ${gasLeft} wei`);
if (gasLeft !== 0n) throw new Error("account paid for gas -- sponsorship is not working");
console.log("\nAll three operations sponsored. The account paid nothing.");
