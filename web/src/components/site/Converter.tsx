"use client";

import { useState } from "react";
import { getRate } from "@/config";
import { fromDisplayUnits } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { ShieldCheck } from "./Icons";

/**
 * Type a figure, watch it convert.
 *
 * Both sides run through the app's own `formatMoney`, so the naira here is the
 * naira the app would show -- including the flooring, which is what the line
 * underneath is claiming. The rate comes from `config`: the draft had ₦1,550,
 * and ours is ₦1,615, so the figure follows the deployment rather than the
 * mock. "Guaranteed Floor" is kept because it is accurate about the rounding,
 * which is guaranteed, rather than about the rate, which is not.
 */
export function Converter() {
  const [dollars, setDollars] = useState("250");

  const held = fromDisplayUnits(
    BigInt(Math.round((Number(dollars) || 0) * 1_000_000)),
    "USD",
  );

  return (
    <div className="flex max-w-xl flex-col gap-2 rounded-2xl bg-wash p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-label-caps uppercase tracking-wider text-body-soft">
          Dual Balance Realtime Peg
        </span>
        <span className="flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-wash-4 px-2.5 py-1 text-[11px] font-semibold text-deep sm:text-label-md">
          <span className="h-1.5 w-1.5 rounded-full bg-grass" />
          Guaranteed Floor: 1 USD = ₦{getRate().toLocaleString("en-US")}
        </span>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-2 min-[400px]:grid-cols-2">
        <label className="flex min-h-[72px] cursor-text flex-col justify-center rounded-xl bg-card p-3.5 shadow-sm transition focus-within:ring-2 focus-within:ring-grass/40">
          <span className="text-label-caps uppercase text-body-soft">
            You Hold
          </span>
          <span className="mt-1 flex items-baseline gap-0.5">
            <span className="font-display text-[20px] font-bold leading-[26px] text-deep sm:text-headline-md">
              $
            </span>
            <input
              value={dollars}
              onChange={(event) =>
                setDollars(event.target.value.replace(/[^0-9.]/g, ""))
              }
              inputMode="decimal"
              aria-label="Amount in dollars"
              className="tabular h-9 w-full min-w-0 bg-transparent font-display text-[20px] font-bold leading-[26px] text-deep outline-none sm:text-headline-md"
            />
          </span>
        </label>

        <div className="flex min-h-[72px] flex-col justify-center rounded-xl bg-card p-3.5 shadow-sm">
          <span className="text-label-caps uppercase text-body-soft">
            Instant Spendable Floor
          </span>
          <p className="tabular mt-1 truncate font-display text-[20px] font-bold leading-[26px] text-deep sm:text-headline-md">
            {formatMoney(held, "NGN")}
          </p>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-body-sm text-body-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-grass" />
        Naira floors ensure the figure on your screen is always spendable.
      </p>
    </div>
  );
}
