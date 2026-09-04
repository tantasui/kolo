# Kolo

Send money to anyone by their **@handle**. It lands in seconds, and it never costs
a thing.

Kolo is a consumer payments app on Monad Testnet. The premise is that the user
never sees a blockchain: they sign in with an email, pick a handle, and hold a
dollar balance. There are no addresses to copy, no gas to buy, no seed phrase to
write down, and no confirmation dialogs. Every transaction is sponsored, and the
send flow batches its approval so a payment is one tap.

This repository is **Phase 1: identity + send**. Claim links, rotating savings
circles (ajo) and shared streaming pots come later; the contracts and data model
are shaped to grow into them, but none of that is built yet.

---

## Status

| | |
| --- | --- |
| Contracts | Written, 45 tests passing, **deployed to Monad Testnet** |
| Deployment | **Verified live**: handles registered and resolved, faucet minted, batched approve + send moved $10.00, `Sent` event decoded |
| App | Builds and type-checks; every screen rendered and reviewed at a 390px viewport |
| Sponsored transactions | **Verified on Monad Testnet** — handle claim, faucet and a batched approve + send all sponsored, account balance 0 wei throughout (`npm run verify:sponsorship`) |
| Sign-in | Privy SDK initialises against the configured app; the landing screen is live |
| End-to-end demo | On-chain path proven; the browser half (email OTP → claim → send) is a manual run-through |

---

## What is here

```
contracts/          Foundry project -- registry, payment router, demo dollar
  src/
    KoloRegistry.sol    handle -> account
    KoloPay.sol         payment router, emits the activity feed
    TestUSD.sol         6-decimal demo dollar with an hourly faucet
  test/                 45 tests, happy paths and reverts
  script/Deploy.s.sol   deploys all three, prints addresses

web/                Next.js PWA -- the entire user-facing app
  src/config.ts         every address, RPC and key, in one place
  src/abi/              contract ABIs
  src/hooks/            smart account, handle, balance, activity, send
  src/lib/activity/     the data layer the UI reads through
  src/components/       screens and UI primitives

scripts/deploy.sh   deploys and writes the addresses into web/.env.local
```

---

## How it works

**Sign-in and sponsorship.** Built on Monad's official
[`next-serwist-privy-smart-wallet`](https://github.com/monad-developers/next-serwist-privy-smart-wallet)
template: Privy provides email/passkey sign-in and an embedded signer, that
signer owns a Kernel v0.3.1 smart account on EntryPoint v0.7, and a Pimlico
paymaster sponsors every operation.

**Which path is used:** the official template path. The backend-relayer
fallback was not needed — sponsorship works on Monad Testnet as documented.

That is checked rather than assumed. `npm run verify:sponsorship` stands a
throwaway local key in for Privy's signer (Privy's only job is to produce one)
and drives a Kernel account through the exact calls the UI makes: claim a
handle, add demo funds, then a batched `approve` + `sendToHandle`. The account
starts and ends holding **0 wei**, so every operation was paid for by the
paymaster:

```
account   : 0xC661f95D17711f6e5518C74cEC0094A4C48055DD
gas held  : 0 wei (expected 0)
[1/3] claiming @kolo_vn63rge …   ok
[2/3] adding demo funds …        balance = $100.00
[3/3] sending $10.00 …           balance $100.00 -> $90.00
gas held after 3 operations: 0 wei
```

**Why a payment router.** `KoloPay.sendToHandle` resolves the recipient through
the registry and emits a single `Sent` event carrying both handles, the amount
and the memo. Raw ERC-20 transfers would give us an anaemic `Transfer` log with
no handles and no note; one router event means one clean stream to index, and
the same contract is where links, circles and pots will live.

**Why sending is one tap.** ERC-4337 accounts can batch, so the `approve` and
the `sendToHandle` go out as a single sponsored user operation. The user is
never asked to confirm twice, and never asked to confirm at all.

### The activity feed, and its one real constraint

Monad's public RPC caps `eth_getLogs` at a **100-block range**. At ~400ms blocks
that is about 40 seconds of history per query, which is not enough to rebuild a
feed from scratch.

So the MVP does three things: it sweeps the trailing 100-block window every few
seconds to catch incoming payments, it persists what it has seen to
`localStorage` so history survives a reload, and it resumes from the last synced
block (capped) rather than rescanning after the app has been closed.

Every read goes through the `ActivitySource` interface in
[`web/src/lib/activity/types.ts`](web/src/lib/activity/types.ts). Swapping the
RPC implementation for an Envio HyperIndex one means implementing that interface
and changing one line in `useActivity` — no UI component knows where activity
comes from.

---

## Setup

### Prerequisites

- Node.js 18+
- [Foundry](https://getfoundry.sh) v1.8+ (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- A [Privy](https://dashboard.privy.io) app
- A [Pimlico](https://dashboard.pimlico.io) API key

### 1. Contracts

```sh
cd contracts
forge test          # 45 tests
```

The contracts are already deployed (see the table at the end), and that
deployment was checked against the live chain: two handles registered and
resolved, the faucet minted, and a batched approve + `sendToHandle` moved
$10.00 with the `Sent` event carrying both handles and the memo.

To deploy, put a funded testnet key in `contracts/.env` (copy
`contracts/.env.example`; generate one with `cast wallet new`), fund it from the
[Monad faucet](https://testnet.monad.xyz), then from the repo root:

```sh
./scripts/deploy.sh
```

That deploys all three contracts and writes their addresses — plus the deploy
block — straight into `web/.env.local`.

### 2. Privy

In the Privy dashboard: enable **Automatically create embedded wallets on
login**, select **EVM**, and disable external wallets. Copy the app ID.

### 3. Pimlico

Create an API key, select the **Monad Testnet** RPC, and copy the bundler URL.

### 4. Run the app

```sh
cd web
cp .env.example .env.local   # if deploy.sh has not already made it
npm ci                       # prefer ci over install; see the note below
npm run dev                  # http://localhost:3000
```

> `npm ci` installs exactly what the lockfile pins. Prefer it here: a targeted
> `npm install <pkg>@<version>` in this tree has been observed to drop `ox` (a
> `viem` dependency that `permissionless` also peer-requires at a different
> range) from the lockfile, which breaks the build with
> `Module not found: Can't resolve 'ox'`. If that happens, delete
> `node_modules` and `package-lock.json` and reinstall.

Only `NEXT_PUBLIC_PRIVY_APP_ID` and `NEXT_PUBLIC_PIMLICO_BUNDLER_URL` are
required — the contract addresses already default to the live deployment. If
either is missing the app says so on screen instead of failing silently.

To confirm sponsorship is working before touching the UI:

```sh
npm run verify:sponsorship
```

### Environment variables

All of these live in `web/.env.local` and are read in exactly one place,
[`web/src/config.ts`](web/src/config.ts).

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID, for email/passkey sign-in |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Optional; leave blank unless your Privy app needs one |
| `NEXT_PUBLIC_PIMLICO_BUNDLER_URL` | Pimlico bundler + paymaster URL for Monad Testnet |
| `NEXT_PUBLIC_MONAD_RPC_URL` | Defaults to `https://testnet-rpc.monad.xyz` |
| `NEXT_PUBLIC_KOLO_REGISTRY_ADDRESS` | Optional; defaults to the deployment below |
| `NEXT_PUBLIC_KOLO_PAY_ADDRESS` | Optional; defaults to the deployment below |
| `NEXT_PUBLIC_TEST_USD_ADDRESS` | Optional; defaults to the deployment below |
| `NEXT_PUBLIC_KOLO_DEPLOY_BLOCK` | Optional; bounds how far back the feed scans |

`contracts/.env` holds only `MONAD_RPC_URL` and the deployer `PRIVATE_KEY`. Both
env files are gitignored.

---

## Deploying

A [`netlify.toml`](netlify.toml) is committed, so Netlify needs no manual build
settings — it builds from `web/` with the Next.js runtime, on Node 20.

1. Point Netlify at this repository and deploy.
2. Set two build environment variables in **Site configuration → Environment
   variables**:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_PRIVY_APP_ID` | your Privy app ID |
   | `NEXT_PUBLIC_PIMLICO_BUNDLER_URL` | your Pimlico bundler URL |

   These are `NEXT_PUBLIC_*`, so they are baked in at **build** time — set them
   before the first build, and redeploy after changing either. The contract
   addresses default to the live deployment, so nothing else is required.
3. Add the resulting `https://<site>.netlify.app` origin to **Allowed origins**
   in the Privy dashboard, or sign-in will be rejected.

The HTTPS origin matters for more than Privy: service workers and passkeys
only work in a secure context, so installing Kolo to a phone's home screen
needs the deployed URL, not a `http://<lan-ip>:3000` address.

---

## Demo script

Two phones, or two browser profiles. Needs the Privy and Pimlico values set.

1. **Amara** opens Kolo, taps **Get started**, signs in with her email.
2. She picks `@amara` — availability updates as she types — and taps
   **Claim @amara**. No confirmation, no fee.
3. **Tunde** does the same on the second device and claims `@tunde`.
4. Amara taps **Add demo funds**. Her balance becomes **$100.00**.
5. She taps **Send**, types `tunde`, and the recipient card appears with a check
   the moment the handle resolves.
6. She keys in **10**, adds the note *lunch*, and reviews: *Send $10.00 to
   @tunde*, **No fee**.
7. One tap. **Sending…**, then a check and a confetti burst.
8. Amara is back on Home at **$90.00** with the payment at the top of Activity.
   Within a few seconds Tunde's balance reads **$10.00** and the payment appears
   in his feed too.

Nothing in that flow mentions crypto, and neither user pays for gas.

### Install it as an app

Open the site on a phone and use **Add to Home Screen** (the app offers this
itself on supported browsers). It runs standalone, with an offline fallback.

---

## Language rules

The UI is held to a vocabulary. It says: Balance, Send, Add demo funds,
@handle, No fee, Note, Sending…. It never says wallet, gas, transaction, hash, blockchain,
Monad, token, approve, sign, smart account, or wei. Failures say
*"Something went wrong — try again"* and the real error goes to the console.

---

## Deployed addresses

Monad Testnet (chain ID `10143`):

| Contract | Address |
| --- | --- |
| `KoloRegistry` | `0xa4d9181bc7740d63df4783ff2c60ebb84f413212` |
| `KoloPay` | `0x99278ba6c5b64c72862c678b38c25a3c7cf59547` |
| `TestUSD` | `0xeb7cc503d0ed16c90e26eaab301cd9d0912cec4f` |

Deployed at block `59479502`. These are the defaults in
[`web/src/config.ts`](web/src/config.ts), so a fresh clone talks to them without
deploying anything — you only need the Privy and Pimlico values. Set the
`NEXT_PUBLIC_KOLO_*` / `NEXT_PUBLIC_TEST_USD_ADDRESS` env vars to point at your
own deployment instead.
