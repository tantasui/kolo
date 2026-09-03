/** Minimal ABI for KoloRegistry -- only what the app calls. */
export const koloRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "handle", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "handleOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "isAvailable",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isValidHandle",
    stateMutability: "pure",
    inputs: [{ name: "handle", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "HandleRegistered",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "handle", type: "string", indexed: false },
    ],
  },
  { type: "error", name: "InvalidHandle", inputs: [] },
  { type: "error", name: "HandleTaken", inputs: [] },
  { type: "error", name: "AlreadyRegistered", inputs: [] },
] as const;
