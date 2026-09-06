/** KoloFaucet -- our own demo faucet, stocked with AUSD.
 *
 *  Agora's faucet pays 10,000 AUSD a time, which is nonsense to show a user,
 *  so we hand out a normal-looking amount from a reserve we top up ourselves.
 *  `drip` pays the address passed in rather than the caller, so the user's
 *  account can fund itself in one sponsored call. */
export const koloFaucetAbi = [
  {
    type: "function",
    name: "drip",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cooldownRemaining",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "dripsRemaining",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "dripAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "Dripped",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "CooldownActive", inputs: [{ name: "availableAt", type: "uint256" }] },
  { type: "error", name: "FaucetEmpty", inputs: [] },
  { type: "error", name: "ZeroRecipient", inputs: [] },
] as const;
