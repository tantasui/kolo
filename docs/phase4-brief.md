# Kolo Phase 4 — Pots & Saving Goals

**Linear project:** `phase4-monadkolo` · **Team:** Tanta (contracts, deploy), Abdol (app)
**Chain:** Monad Testnet (10143) · **Last updated:** 2026-09-17

This is the working spec for Phase 4. It supersedes the original Phase 4 build
prompt wherever the two disagree — the original had two design flaws that are
corrected here (see *What changed from the first draft*).

---

## What we're building

Two features, **Goals first**, then Pots.

- **Goals** — a personal savings target. Money set aside toward something,
  out of the spending balance. Withdraw any time.
- **Pots** — several people put money in for one service; each person pays
  only for what they themselves use, and can take their unspent share back any
  time.

**Why this order:** Goals is about half a day of contract work and carries no
risk. If time runs short, Goals is already shipped and Pots is the feature that
gets cut — rather than something left half-finished.

**Not in this phase (roadmap):** per-second streaming, goals that other people
contribute to, lending.

---

## The rule for moving money

From this phase on, **contracts only ever let people withdraw**. They never
send money to a member on their own.

This is the lesson from Circles. Be accurate about it in the README — the repo
is checkable:

- The contract is `KoloCircle` (42 tests; 142 across the whole suite). There is
  no ERC-8004 fork suite.
- **Circles still pays out directly.** Its `_send` attempts the transfer and,
  only if that fails, records a balance the member can withdraw later.
  `KoloLinks` and `KoloFaucet` pay out directly with no fallback.
- The risk that taught us the rule: on a stablecoin that can freeze addresses,
  one frozen member could have held up a payout for everyone.

Do **not** describe the existing contracts as withdraw-only.

Both new contracts are built with the one configured dollar token. **No
function takes a token address.**

---

## Goals — `KoloGoals.sol`

```solidity
constructor(IERC20 token);

function create(string label, uint256 target, uint64 targetDate)
    returns (uint256 goalId);                        // records intent, moves no money
function contribute(uint256 goalId, uint256 amount); // owner only
function withdraw(uint256 goalId, uint256 amount);   // owner only, any time, any amount

function goalOf(uint256 goalId) view returns (Goal memory);
function goalIdsOf(address owner) view returns (uint256[] memory);
```

- **Only the owner contributes.** Enforced in the contract, not just the app.
- **`reached` is set inside `contribute`** the moment `saved` first crosses
  `target`, with a timestamp. A view function can't write storage, so it can't
  be set "on a view call". It **stays set after a withdrawal** — reaching the
  goal happened; taking the money out afterwards doesn't undo it.
- **No lock, no penalty.** Withdraw any amount at any time, before or after the
  target or the date. An app that promises "your money is always yours" should
  not hold money against its owner's will. Say this in the README.
- **`targetDate` is a note to self**, never enforced. `0` means no date.
- **Pitch it honestly:** the value is separation (money set aside, out of the
  spending balance), not a guarantee — there is nobody to guarantee against.

---

## Pots — `KoloPots.sol`

### What a pot is

A pot is **several ring-fenced balances that share one meter** — not a pool.
Say it that way in the pitch. Every member has one ledger row, and this holds
at all times:

```
contributed = used + withdrawn + available
```

Every action changes **only the caller's own row**:

| Action | Effect |
| --- | --- |
| join / top up | raises `contributed` and `available` |
| `use(potId, units)` | moves `units × price` from the caller's `available` to `used`, and credits the payee. **Reverts if it would take `available` below zero.** |
| `withdraw(potId)` | moves all of the caller's `available` to `withdrawn` and sends it to the caller |

The **payee** (the service being paid for) has one number — what members have
used — and withdraws it with `withdrawEarnings()`.

```solidity
constructor(KoloRegistry registry, IERC20 token);

function create(string name, address payee, uint256 price, uint256 deposit)
    returns (uint256 potId);                   // creator joins; deposit may be 0
function join(uint256 potId, uint256 amount);
function topUp(uint256 potId, uint256 amount);
function use(uint256 potId, uint256 units);    // from msg.sender's own share only
function withdraw(uint256 potId);              // all of msg.sender's available share
function withdrawEarnings();                   // payee, across every pot it's paid by
function close(uint256 potId);                 // creator; stops spending, moves no money

function availableOf(uint256 potId, address member) view returns (uint256);
```

### Rules

- **Members record their own use.** A member taps *Unlock* on the service page
  and their own account sends `use()` as a sponsored transaction. There is **no
  service key**. The member who used is, by construction, the account that
  sent the transaction.
- **Price is fixed at creation.** Members join under a price; changing it would
  reprice money already put in. A new price is a new pot. Prices are whole
  token units, so `units × price` never rounds.
- **`close` stops joining, topping up and using — and moves no money.**
  Withdrawals and the payee's earnings stay available forever, including from a
  closed pot. It needs no balance condition.
- **Joining is open.** Unlike Circles, a stranger joining a pot can only ever
  spend money they put in themselves, so there's nothing to protect. Put one
  sentence in the README explaining why Pots and Circles made different choices.
- **No loops over members**, so no member cap is needed for safety.
- **The contract cannot prove a service delivered anything.** It proves who
  paid, how much, and that nobody paid from someone else's share. Say that
  plainly.

### Demo payee

One fixed account we control, standing in for the mock premium-content
service, set as a default in `web/src/config.ts` (ideally with a handle such as
`@kolo_premium`). Every demo pot pays it. This account can only withdraw its
own earnings — it has no power to charge anyone.

### Tests

- **Named fairness test:** A puts in 100 and uses 80; B puts in 100 and uses
  nothing; A's attempt to use 40 more **reverts**; then B withdraws 100, A
  withdraws 20, the payee withdraws 80, and the contract holds 0.
- **Three invariants, fuzzed** over random join / top-up / use / withdraw /
  close sequences by several members:
  1. every member row: `contributed == used + withdrawn + available`
  2. every pot: sum of members' `used` == what it credited the payee
  3. `token.balanceOf(pots) == Σ available (all pots) + Σ unwithdrawn earnings`

  (The first draft's invariant — "withdrawable + service + remaining balance =
  contributed" — counted member money twice and could never hold.)
- Plus: use reverts past the member's own share; withdraw can't pay twice;
  close stops use/join/top-up but not withdrawals; price can't change.
- **Check the fuzz isn't vacuous:** deliberately break one line and confirm it
  fails, then restore.

---

## What changed from the first draft

| First draft | Problem | Now |
| --- | --- | --- |
| Draws capped by the **pot's** balance | One member could spend past their share; the overspend came out of whoever hadn't spent (A puts in 100 and uses 150 → B is owed 100 but only 50 is left) | Use capped at the **member's own** available share |
| `recordDraw(potId, member, amount)` signed by a service key | The app has no server, so the key would ship to the browser, where anyone could read it and charge any member any amount | Member sends `use()` themselves |
| Close only at zero balance | One member who never withdraws holds the pot open forever; closing protected nothing | Close stops spending only |
| `createPot(token)`, `createGoal(token, …)` | Conflicts with "one pinned token" | Token fixed at construction |
| `achieved` set "on a view call" | Views can't write storage | `reached` set in `contribute` |

---

## App

**Vocabulary** — Pots: pot, share, put in, used, available to withdraw,
withdraw. Goals: goal, saved, target, withdraw.
Never: escrow, pull payment, credited balance, pool, wallet, gas, blockchain,
token.

- **Goals:** list with progress ("₦120,000 / ₦200,000 toward New Laptop —
  60%"); create with label, target, date — copy says *"a target to aim for,
  withdraw anytime"*; contribute with quick amounts + custom entry, one
  sponsored transaction; confetti on reaching the target; withdraw.
- **Pots:** build on the Circles list/detail shell. Create (name, price, payee
  defaults to the demo service); join; top up; detail with one row per member
  — put in, used, available — updating as uses land, not only on refresh; big
  *Withdraw my share* button that works on a closed pot too.
- **Mock service page:** content behind an *Unlock* button that sends
  `use(potId, 1)` from the viewer's own account and shows the content once it
  lands.

---

## Build order

| # | Task | Owner | Depends on |
| --- | --- | --- | --- |
| 1 | KoloGoals contract + tests | Tanta | — |
| 2 | KoloPots contract + tests | Tanta | — |
| 3 | Deploy both; config defaults; README payout section | Tanta | 1, 2 |
| 4 | Goals UI | Abdol | 3 |
| 5 | Pots UI | Abdol | 3 |
| 6 | Mock service page + two-phone Pots demo | Abdol | 5 |

## Definition of done

1. `forge test` green for both contracts, including the Pots fairness test and
   invariants; both deployed to Monad Testnet; addresses in `config.ts` and the
   README.
2. **Goals demo:** create a goal, contribute in two steps, reach the target, see
   the celebration, then withdraw anyway — proving nothing is locked.
3. **Pots demo:** two phones join one pot; one unlocks content on the mock
   service page and the other doesn't; both see the figures update; the idle
   member withdraws their full share, unaffected.
4. **README:** the withdraw-only rule, described accurately against the existing
   contracts; the per-member fairness rule; the no-lock rationale for Goals; why
   Pots joins are open and Circles' shouldn't be; what's cut, as roadmap.
