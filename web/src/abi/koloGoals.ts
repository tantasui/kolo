/**
 * KoloGoals -- money set aside toward a target. Only what the app calls.
 *
 * Taken from the deployed contracts/src/KoloGoals.sol. The `Goal` tuple's field
 * order matters and is not obvious: a tuple decodes by position, so a struct
 * ordered differently returns plausible nonsense rather than failing. It is
 * read in exactly one place, `toGoal` in hooks/useGoals.ts.
 */
export const koloGoalsAbi = [
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "target", type: "uint256" },
      { name: "targetDate", type: "uint64" },
    ],
    outputs: [{ name: "goalId", type: "uint256" }],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "goalId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "goalOf",
    stateMutability: "view",
    inputs: [{ name: "goalId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        // Order mirrors KoloGoals.Goal exactly. Do not tidy.
        components: [
          { name: "owner", type: "address" },
          { name: "target", type: "uint256" },
          { name: "saved", type: "uint256" },
          { name: "targetDate", type: "uint64" },
          { name: "reachedAt", type: "uint64" },
          { name: "reached", type: "bool" },
          { name: "label", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "goalIdsOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "event",
    name: "GoalCreated",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "label", type: "string", indexed: false },
      { name: "target", type: "uint256", indexed: false },
      { name: "targetDate", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GoalReached",
    inputs: [
      { name: "goalId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "reachedAt", type: "uint64", indexed: false },
    ],
  },
  { type: "error", name: "GoalNotFound", inputs: [] },
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "AmountZero", inputs: [] },
  { type: "error", name: "TargetZero", inputs: [] },
  { type: "error", name: "LabelTooLong", inputs: [] },
  { type: "error", name: "NotEnoughSaved", inputs: [] },
] as const;
