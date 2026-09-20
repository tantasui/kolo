/**
 * Proves a pot works for two people on Monad Testnet.
 *
 * Two throwaway signers stand in for two phones, each owning its own Kernel
 * account, and drive the exact calls the Pots screens make. The run is the
 * fairness test from the brief, on chain:
 *
 *   A puts in $80 and uses $60 of it. B puts in $40 and uses nothing.
 *   A trying to use more than their own share must REVERT -- the overspend
 *   must not come out of B. Then everybody takes their money back and the
 *   contract is left holding nothing.
 *
 * Closing is checked too, because the app promises a share can still be
 * withdrawn from a closed pot.
 *
 *   cd web && npm run verify:pots
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
const POTS = process.env.NEXT_PUBLIC_KOLO_POTS_ADDRESS || "0x176abcd860AF6efacCA16b227AE26E4C17bf0e44";
const PAYEE = process.env.NEXT_PUBLIC_KOLO_DEMO_PAYEE || "0xA7d1eDa377d49F8dFE02caE5DEbD0B6079cDB9e8";

if (!BUNDLER) throw new Error("missing NEXT_PUBLIC_PIMLICO_BUNDLER_URL");

const erc20Abi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
];
const faucetAbi = [
  { type: "function", name: "drip", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }], outputs: [] },
];
const potsAbi = [
  { type: "function", name: "create", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }, { name: "payee", type: "address" }, { name: "price", type: "uint256" }, { name: "deposit", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "join", stateMutability: "nonpayable", inputs: [{ name: "potId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "use", stateMutability: "nonpayable", inputs: [{ name: "potId", type: "uint256" }, { name: "units", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "potId", type: "uint256" }], outputs: [] },
  { type: "function", name: "close", stateMutability: "nonpayable", inputs: [{ name: "potId", type: "uint256" }], outputs: [] },
  { type: "function", name: "potCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "availableOf", stateMutability: "view", inputs: [{ name: "potId", type: "uint256" }, { name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "memberOf", stateMutability: "view",
    inputs: [{ name: "potId", type: "uint256" }, { name: "a", type: "address" }],
    outputs: [{ type: "tuple", components: [
      { name: "contributed", type: "uint256" },
      { name: "used", type: "uint256" },
      { name: "withdrawn", type: "uint256" },
      { name: "joined", type: "bool" },
    ] }],
  },
];

const chain = defineChain({ ...monadTestnet, rpcUrls: { default: { http: [RPC] } } });
const publicClient = createPublicClient({ chain, transport: http(RPC) });
const pimlico = createPimlicoClient({ transport: http(BUNDLER), entryPoint: { address: entryPoint07Address, version: "0.7" } });

async function phone(label) {
  const account = await toKernelSmartAccount({
    client: publicClient,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    owners: [privateKeyToAccount(generatePrivateKey())],
    version: "0.3.1",
  });
  const smart = createSmartAccountClient({
    account, chain, bundlerTransport: http(BUNDLER), paymaster: pimlico,
    userOperation: { estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast },
  });
  console.log(`${label} : ${account.address}`);
  return { label, address: account.address, send: (calls) => smart.sendTransaction({ calls }) };
}

const usd = (v) => `$${Number(formatUnits(v, 6)).toFixed(2)}`;
const balanceOf = (a) => publicClient.readContract({ address: TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [a] });
const availableOf = (id, a) => publicClient.readContract({ address: POTS, abi: potsAbi, functionName: "availableOf", args: [id, a] });
const rowOf = (id, a) => publicClient.readContract({ address: POTS, abi: potsAbi, functionName: "memberOf", args: [id, a] });
const check = (ok, what) => {
  if (!ok) throw new Error(`FAILED: ${what}`);
  console.log(`      ✓ ${what}`);
};
const putIn = (who, id, amount, fn) =>
  who.send([
    { to: TOKEN, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [POTS, amount] }) },
    { to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: fn, args: [id, amount] }) },
  ]);

const A = await phone("phone A");
const B = await phone("phone B");
console.log(`pots    : ${POTS}\n`);

console.log("[0/6] giving both phones demo funds …");
for (const who of [A, B]) {
  await who.send([{ to: FAUCET, data: encodeFunctionData({ abi: faucetAbi, functionName: "drip", args: [who.address] }) }]);
}
const startA = await balanceOf(A.address);
const startB = await balanceOf(B.address);
console.log(`      A ${usd(startA)}, B ${usd(startB)}\n`);

const PRICE = 20_000000n;
const A_IN = 80_000000n;
const B_IN = 40_000000n;

console.log(`[1/6] A starts a pot at ${usd(PRICE)} a use, putting in ${usd(A_IN)} …`);
// `create` takes (name, payee, price, deposit), so it is built directly rather
// than through putIn, which is for the (potId, amount) pair.
await A.send([
  { to: TOKEN, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [POTS, A_IN] }) },
  { to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: "create", args: ["Netflix", PAYEE, PRICE, A_IN] }) },
]);
const id = await publicClient.readContract({ address: POTS, abi: potsAbi, functionName: "potCount" });
console.log(`      pot #${id}`);

console.log(`\n[2/6] B joins the same pot with ${usd(B_IN)} …`);
await putIn(B, id, B_IN, "join");
check((await rowOf(id, B.address)).joined, "B has a row of their own");
check((await availableOf(id, A.address)) === A_IN, `A has ${usd(A_IN)} available to withdraw`);
check((await availableOf(id, B.address)) === B_IN, `B has ${usd(B_IN)} available to withdraw`);

console.log("\n[3/6] A uses it three times …");
await A.send([{ to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: "use", args: [id, 3n] }) }]);
check((await rowOf(id, A.address)).used === 3n * PRICE, `A has used ${usd(3n * PRICE)}`);
check((await availableOf(id, A.address)) === A_IN - 3n * PRICE, "A's own share went down");
check((await availableOf(id, B.address)) === B_IN, "B's share is untouched by A spending");

console.log("\n[4/6] A tries to use more than their own share …");
let reverted = false;
try {
  await A.send([{ to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: "use", args: [id, 2n] }) }]);
} catch {
  reverted = true;
}
check(reverted, "refused — the overspend cannot come out of B");

console.log("\n[5/6] A closes the pot …");
await A.send([{ to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: "close", args: [id] }) }]);

console.log("\n[6/6] both withdraw from the closed pot …");
const beforeB = await balanceOf(B.address);
await B.send([{ to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: "withdraw", args: [id] }) }]);
check((await balanceOf(B.address)) - beforeB === B_IN, "B, who used nothing, got back every naira of it");

const beforeA = await balanceOf(A.address);
await A.send([{ to: POTS, data: encodeFunctionData({ abi: potsAbi, functionName: "withdraw", args: [id] }) }]);
check((await balanceOf(A.address)) - beforeA === A_IN - 3n * PRICE, "A got back exactly what they had not used");

check((await availableOf(id, A.address)) === 0n && (await availableOf(id, B.address)) === 0n, "nothing left for either of them");
check((await balanceOf(A.address)) === startA - 3n * PRICE, `A is out exactly the ${usd(3n * PRICE)} they used`);
check((await balanceOf(B.address)) === startB, "B is exactly where they started");

for (const who of [A, B]) {
  const gas = await publicClient.getBalance({ address: who.address });
  check(gas === 0n, `${who.label} paid nothing for any of it`);
}

console.log("\nTwo accounts, one pot, on testnet: each paid only for what they used.");
