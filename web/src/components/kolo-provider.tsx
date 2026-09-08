"use client";

import { createContext, useContext } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { ActivityItem } from "@/lib/activity";
import type { Currency } from "@/lib/currency";
import { useActivity } from "@/hooks/useActivity";
import { useCurrency } from "@/hooks/useCurrency";
import { useBalance } from "@/hooks/useBalance";
import { useHandle, type HandleStatus } from "@/hooks/useHandle";
import { useSendPayment, type SendRequest } from "@/hooks/useSendPayment";
import { useSmartWallet } from "@/hooks/useSmartWallet";

interface KoloValue {
  signedIn: boolean;
  accountReady: boolean;
  address: `0x${string}` | null;

  handle: string | null;
  handleStatus: HandleStatus;
  claimHandle: (handle: string) => Promise<void>;

  /** How money is displayed. Purely presentational; the chain holds dollars. */
  currency: Currency;
  setCurrency: (next: Currency) => void;

  balance: bigint | null;
  refreshBalance: () => Promise<void>;
  addMoney: () => Promise<void>;

  activity: ActivityItem[];
  addPendingActivity: ReturnType<typeof useActivity>["addPending"];
  refreshActivity: () => Promise<void>;

  send: (request: SendRequest) => Promise<`0x${string}`>;
}

const KoloContext = createContext<KoloValue | null>(null);

/**
 * Single subscription point for account, balance and activity, so polling
 * happens once no matter how many screens are mounted.
 */
export function KoloProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = usePrivy();
  const { address, ready } = useSmartWallet();
  const { handle, status: handleStatus, claim } = useHandle();
  const { currency, setCurrency } = useCurrency();
  const { balance, refresh: refreshBalance, addMoney } = useBalance();
  const { items, addPending, refresh: refreshActivity } = useActivity();
  const { send } = useSendPayment();

  return (
    <KoloContext.Provider
      value={{
        signedIn: authenticated,
        accountReady: ready,
        address,
        handle,
        handleStatus,
        claimHandle: claim,
        currency,
        setCurrency,
        balance,
        refreshBalance,
        addMoney,
        activity: items,
        addPendingActivity: addPending,
        refreshActivity,
        send,
      }}
    >
      {children}
    </KoloContext.Provider>
  );
}

export function useKolo(): KoloValue {
  const value = useContext(KoloContext);
  if (!value) throw new Error("useKolo must be used inside KoloProvider");
  return value;
}
