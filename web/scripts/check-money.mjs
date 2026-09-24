/**
 * Guards the one rule that decides whether a number on screen is real money.
 *
 * Naira and dollars do not divide into each other, so each conversion has to
 * round, and the *direction* carries two promises:
 *
 *   1. what you typed is what you see next      -- type ₦5,000, review ₦5,000
 *   2. what you are shown, you can spend        -- the balance on screen is
 *                                                  never more than is held
 *
 * They pull opposite ways: naira -> dollars rounds up, dollars -> naira is
 * shown rounded down. Flip either and one promise breaks quietly -- the app
 * still builds, every screen still renders, and somebody's "send everything"
 * reverts, or an amount changes between two screens.
 *
 * So this exercises the real functions in src/lib/money.ts over millions of
 * amounts, at the configured rate and at a spread of others.
 *
 *   cd web && npm run check:money
 *
 * Needs Node 22.6+ (it imports TypeScript directly).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_SUPPORTED_RATE,
  MICRO,
  toNairaUnits,
  toUsdUnits,
  wholeNairaShown,
} from "../src/lib/money.ts";

const here = dirname(fileURLToPath(import.meta.url));

/** The rate the app actually ships, read from config rather than repeated. */
function configuredRate() {
  const source = readFileSync(resolve(here, "../src/config.ts"), "utf8");
  const found = /ngnPerUsd:\s*([\d_]+)/.exec(source);
  if (!found) throw new Error("could not find ngnPerUsd in config.ts");
  return BigInt(found[1].replace(/_/g, ""));
}

const failures = [];
const fail = (message) => {
  if (failures.length < 5) failures.push(message);
};

/** Typing an amount must show that same amount back. */
function typedAmountSurvives(rate, upTo) {
  for (let naira = 1n; naira <= upTo; naira++) {
    const usd = toUsdUnits(naira * MICRO, rate);
    const shown = wholeNairaShown(usd, rate);
    if (shown !== naira) fail(`rate ${rate}: typed ₦${naira} came back as ₦${shown}`);
  }
}

/** A balance shown on screen must never ask for more than is held. */
function shownBalanceIsSpendable(rate, upTo) {
  for (let held = 1n; held <= upTo; held++) {
    const shown = wholeNairaShown(held, rate);
    if (shown === 0n) continue;
    const asked = toUsdUnits(shown * MICRO, rate);
    if (asked > held) {
      fail(`rate ${rate}: balance shows ₦${shown}, which asks ${asked} of ${held} held`);
    }
  }
}

/** Rounding up must cost at most one micro-dollar. */
function overshootIsAtMostOneMicroDollar(rate, upTo) {
  for (let naira = 1n; naira <= upTo; naira++) {
    const overshoot = toUsdUnits(naira * MICRO, rate) - (naira * MICRO) / rate;
    if (overshoot > 1n) fail(`rate ${rate}: ₦${naira} overshoots by ${overshoot}`);
  }
}

const rate = configuredRate();
console.log(`configured rate: ₦${rate} to the dollar`);

if (!(rate > 0n && rate < MAX_SUPPORTED_RATE)) {
  fail(`rate ${rate} is outside the range the rounding rule holds for (0 < rate < ${MAX_SUPPORTED_RATE})`);
}

// The shipped rate, hard; a spread of others, lighter -- including the awkward
// ones: 1 (naira is a dollar), a prime, and just under the supported ceiling.
const others = [1n, 7n, 999n, 1_000n, 1_337n, 50_000n, 999_983n];

typedAmountSurvives(rate, 500_000n);
shownBalanceIsSpendable(rate, 800_000n);
overshootIsAtMostOneMicroDollar(rate, 500_000n);

for (const other of others) {
  typedAmountSurvives(other, 20_000n);
  shownBalanceIsSpendable(other, 20_000n);
  overshootIsAtMostOneMicroDollar(other, 20_000n);
}

// Dollars must pass through untouched, whatever the rate.
for (const units of [0n, 1n, 999_999n, 1_000_000n, 123_456_789n]) {
  if (toNairaUnits(units, 1n) !== units) fail(`a rate of 1 changed ${units}`);
}

if (failures.length > 0) {
  console.error("\nthe money rounding rule is broken:\n");
  for (const message of failures) console.error(`  ${message}`);
  process.exit(1);
}

console.log("typed amounts survive the round trip");
console.log("a shown balance is always spendable");
console.log("rounding up costs at most one micro-dollar");
console.log("\nmoney rounding holds.");
