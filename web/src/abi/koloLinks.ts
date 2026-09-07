/** KoloLinks -- money parked behind a secret, for sending to someone who has
 *  no handle yet. Only what the app calls. */
export const koloLinksAbi = [
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "secretHash", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "memo", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "secret", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "reclaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "secretHash", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isClaimable",
    stateMutability: "view",
    inputs: [{ name: "secretHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isLive",
    stateMutability: "view",
    inputs: [{ name: "secretHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hashOf",
    stateMutability: "pure",
    inputs: [{ name: "secret", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "linkOf",
    stateMutability: "view",
    inputs: [{ name: "secretHash", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "LinkCreated",
    inputs: [
      { name: "secretHash", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "senderHandle", type: "string", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "memo", type: "string", indexed: false },
      { name: "expiresAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LinkClaimed",
    inputs: [
      { name: "secretHash", type: "bytes32", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LinkReclaimed",
    inputs: [
      { name: "secretHash", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "afterExpiry", type: "bool", indexed: false },
    ],
  },
  { type: "error", name: "LinkExists", inputs: [] },
  { type: "error", name: "LinkExpired", inputs: [] },
  { type: "error", name: "LinkNotFound", inputs: [] },
  { type: "error", name: "AmountZero", inputs: [] },
  { type: "error", name: "InvalidToken", inputs: [] },
  { type: "error", name: "MemoTooLong", inputs: [] },
  { type: "error", name: "NotSender", inputs: [] },
  { type: "error", name: "ZeroRecipient", inputs: [] },
] as const;
