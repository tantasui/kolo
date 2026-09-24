/**
 * KoloPots -- several ring-fenced shares behind one meter. Only what the app
 * calls.
 *
 * Taken from the deployed contracts/src/KoloPots.sol. Both tuples decode by
 * position, so their field order mirrors the structs exactly and must not be
 * tidied; they are read in one place each, in hooks/usePots.ts.
 */
export const koloPotsAbi = [
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "payee", type: "address" },
      { name: "price", type: "uint256" },
      { name: "deposit", type: "uint256" },
    ],
    outputs: [{ name: "potId", type: "uint256" }],
  },
  {
    type: "function",
    name: "join",
    stateMutability: "nonpayable",
    inputs: [
      { name: "potId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "topUp",
    stateMutability: "nonpayable",
    inputs: [
      { name: "potId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "use",
    stateMutability: "nonpayable",
    inputs: [
      { name: "potId", type: "uint256" },
      { name: "units", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "potId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "close",
    stateMutability: "nonpayable",
    inputs: [{ name: "potId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "potOf",
    stateMutability: "view",
    inputs: [{ name: "potId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        // Mirrors KoloPots.Pot exactly.
        components: [
          { name: "creator", type: "address" },
          { name: "payee", type: "address" },
          { name: "price", type: "uint256" },
          { name: "used", type: "uint256" },
          { name: "memberCount", type: "uint32" },
          { name: "status", type: "uint8" },
          { name: "name", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "memberOf",
    stateMutability: "view",
    inputs: [
      { name: "potId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        // Mirrors KoloPots.Member exactly.
        components: [
          { name: "contributed", type: "uint256" },
          { name: "used", type: "uint256" },
          { name: "withdrawn", type: "uint256" },
          { name: "joined", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "rosterOf",
    stateMutability: "view",
    inputs: [{ name: "potId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "availableOf",
    stateMutability: "view",
    inputs: [
      { name: "potId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  { type: "function", name: "potCount", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "event",
    name: "PotCreated",
    inputs: [
      { name: "potId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "creatorHandle", type: "string", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "payee", type: "address", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Used",
    inputs: [
      { name: "potId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "units", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "PotNotFound", inputs: [] },
  { type: "error", name: "PotIsClosed", inputs: [] },
  { type: "error", name: "NotCreator", inputs: [] },
  { type: "error", name: "NotAMember", inputs: [] },
  { type: "error", name: "AlreadyJoined", inputs: [] },
  { type: "error", name: "AmountZero", inputs: [] },
  { type: "error", name: "InvalidPrice", inputs: [] },
  { type: "error", name: "InvalidPayee", inputs: [] },
  { type: "error", name: "NameTooLong", inputs: [] },
  { type: "error", name: "InsufficientShare", inputs: [] },
  { type: "error", name: "NothingToWithdraw", inputs: [] },
] as const;
