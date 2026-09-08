"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  DEFAULT_CURRENCY,
  loadCurrency,
  saveCurrency,
  type Currency,
} from "@/lib/currency";

/**
 * The user's display currency, remembered per Privy user id.
 *
 * Keyed on the person rather than the account address so the choice survives
 * sign-out and is restored the moment they sign back in. Reads happen after
 * mount: localStorage does not exist during the server render, and starting
 * from the default keeps the first paint identical on both sides.
 */
export function useCurrency() {
  const { user } = usePrivy();
  const userId = user?.id ?? null;

  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    if (!userId) {
      setCurrencyState(DEFAULT_CURRENCY);
      return;
    }
    setCurrencyState(loadCurrency(userId));
  }, [userId]);

  const setCurrency = useCallback(
    (next: Currency) => {
      setCurrencyState(next);
      if (userId) saveCurrency(userId, next);
    },
    [userId]
  );

  return { currency, setCurrency };
}
