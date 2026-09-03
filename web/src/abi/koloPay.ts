/** Minimal ABI for KoloPay -- only what the app calls. */
export const koloPayAbi = [
  {
    type: "function",
    name: "sendToHandle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "memo", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Sent",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "fromHandle", type: "string", indexed: false },
      { name: "toHandle", type: "string", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "memo", type: "string", indexed: false },
    ],
  },
  { type: "error", name: "HandleNotFound", inputs: [] },
  { type: "error", name: "AmountZero", inputs: [] },
  { type: "error", name: "InvalidToken", inputs: [] },
  { type: "error", name: "SelfSend", inputs: [] },
  { type: "error", name: "MemoTooLong", inputs: [] },
] as const;
