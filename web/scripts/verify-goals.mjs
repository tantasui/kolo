/**
 * Proves the Goals flow end to end on Monad Testnet.
 *
 * Privy's only job in the app is to produce a signer, so this stands a
 * throwaway local key in its place and drives a Kernel account through the
 * exact calls the Goals screens make: create a goal, add to it twice until the
 * target is reached, then withdraw part of it. The encoded calldata is the same
 * as the UI's -- both go through the same ABI -- and every operation is
 * sponsored, so the account starts and ends holding 0 wei.
 *
 * The last step is the point of the feature: withdrawing after reaching the
 * target must work, and must not undo having reached it.
 *
 *   cd web && npm run verify:goals
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
const TOKEN = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC";
const FAUCET = process.env.NEXT_PUBLIC_KOLO_FAUCET_ADDRESS || "0xc656E6c73752C0e0bf57b1CD7822293c5E69570F";
const GOALS = process.env.NEXT_PUBLIC_KOLO_GOALS_ADDRESS || "0x28f0B605eB5b8b493f8071747433658d70C6465F";

if (!BUNDLER) throw new Error("missing NEXT_PUBLIC_PIMLICO_BUNDLER_URL");

const erc20Abi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
];
const faucetAbi = [
  { type: "function", name: "drip", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }], outputs: [] },
];
const goalsAbi = [
  { type: "function", name: "create", stateMutability: "nonpayable", inputs: [{ name: "label", type: "string" }, { name: "target", type: "uint256" }, { name: "targetDate", type: "uint64" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "contribute", stateMutability: "nonpayable", inputs: [{ name: "goalId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "goalId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "goalIdsOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256[]" }] },
  {
    type: "function", name: "goalOf", stateMutability: "view", inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "owner", type: "address" },
        { name: "target", type: "uint256" },
        { name: "saved", type: "uint256" },
        { name: "targetDate", type: "uint64" },
        { name: "reachedAt", type: "uint64" },
        { name: "reached", type: "bool" },
        { name: "label", type: "string" },
      ],
    }],
  },
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
  userOperation: { estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast },
});

const usd = (v) => `$${Number(formatUnits(v, 6)).toFixed(2)}`;
const gas = () => publicClient.getBalance({ address: account.address });
const readGoal = (id) =>
  publicClient.readContract({ address: GOALS, abi: goalsAbi, functionName: "goalOf", args: [id] });
const check = (ok, what) => {
  if (!ok) throw new Error(`FAILED: ${what}`);
  console.log(`      ✓ ${what}`);
};

console.log(`account   : ${account.address}`);
console.log(`goals     : ${GOALS}`);
console.log(`gas held  : ${await gas()} wei (expected 0)\n`);

// --- funds -------------------------------------------------------------
console.log("[0/4] adding demo funds …");
await smart.sendTransaction({
  calls: [{ to: FAUCET, data: encodeFunctionData({ abi: faucetAbi, functionName: "drip", args: [account.address] }) }],
});
const start = await publicClient.readContract({ address: TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
console.log(`      balance = ${usd(start)}\n`);

// --- 1. create ---------------------------------------------------------
const TARGET = 40_000000n;
console.log(`[1/4] creating a goal with a ${usd(TARGET)} target …`);
await smart.sendTransaction({
  calls: [{ to: GOALS, data: encodeFunctionData({ abi: goalsAbi, functionName: "create", args: ["New Laptop", TARGET, 0n] }) }],
});
const ids = await publicClient.readContract({ address: GOALS, abi: goalsAbi, functionName: "goalIdsOf", args: [account.address] });
const id = ids[ids.length - 1];
let goal = await readGoal(id);
console.log(`      goal #${id} "${goal.label}"`);
check(goal.target === TARGET && goal.saved === 0n, "recorded, and holding nothing yet");
check(goal.reached === false, "not reached");

// --- 2 & 3. contribute twice ------------------------------------------
for (const [step, amount] of [["2/4", 15_000000n], ["3/4", 25_000000n]]) {
  console.log(`\n[${step}] adding ${usd(amount)} …`);
  await smart.sendTransaction({
    calls: [
      { to: TOKEN, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [GOALS, amount] }) },
      { to: GOALS, data: encodeFunctionData({ abi: goalsAbi, functionName: "contribute", args: [id, amount] }) },
    ],
  });
  goal = await readGoal(id);
  console.log(`      saved = ${usd(goal.saved)} of ${usd(goal.target)}`);
}
check(goal.saved === TARGET, "the two contributions meet the target exactly");
check(goal.reached === true, "the contract recorded it as reached");
check(goal.reachedAt > 0n, "and stamped when");

// --- 4. withdraw after reaching ---------------------------------------
const TAKE = 10_000000n;
console.log(`\n[4/4] withdrawing ${usd(TAKE)} after reaching it …`);
const before = await publicClient.readContract({ address: TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
await smart.sendTransaction({
  calls: [{ to: GOALS, data: encodeFunctionData({ abi: goalsAbi, functionName: "withdraw", args: [id, TAKE] }) }],
});
const after = await publicClient.readContract({ address: TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
goal = await readGoal(id);
console.log(`      balance ${usd(before)} -> ${usd(after)}, saved = ${usd(goal.saved)}`);
check(after - before === TAKE, "the money came back, in full and with no penalty");
check(goal.saved === TARGET - TAKE, "the goal holds the rest");
check(goal.reached === true, "and reaching it was not undone by taking money out");

const left = await gas();
console.log(`\ngas held after 5 operations: ${left} wei`);
if (left !== 0n) throw new Error("the account paid for gas -- sponsorship is not working");
console.log("\nCreate, contribute twice, reach, withdraw: all on testnet, all sponsored.");
