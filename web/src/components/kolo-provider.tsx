"use client";

import { createContext, useContext } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { ActivityItem } from "@/lib/activity";
import type { Currency } from "@/lib/currency";
import { useActivity } from "@/hooks/useActivity";
import { useCurrency } from "@/hooks/useCurrency";
import { useCircles, type CircleInvite, type CircleSummary } from "@/hooks/useCircles";
import { useGoals } from "@/hooks/useGoals";
import type { Goal } from "@/lib/goals";
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

  /** Circles this account is in, and the two things a member ever does. */
  circles: CircleSummary[];
  refreshCircles: () => Promise<void>;
  createCircle: (params: {
    name: string;
    contribution: bigint;
    size: number;
    roundDuration: number;
  }) => Promise<bigint>;
  contributeToCircle: (circle: CircleSummary) => Promise<void>;
  cureCircle: (circle: CircleSummary) => Promise<void>;
  joinCircle: (invite: CircleInvite) => Promise<void>;

  /** Savings goals this account owns. */
  goals: Goal[];
  goalsLoaded: boolean;
  refreshGoals: () => Promise<void>;
  createGoal: (params: { label: string; target: bigint; targetDate: number }) => Promise<bigint>;
  contributeToGoal: (goal: Goal, amount: bigint) => Promise<Goal>;
  withdrawFromGoal: (goal: Goal, amount: bigint) => Promise<Goal>;
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
  const {
    circles,
    create: createCircle,
    refresh: refreshCircles,
    contribute: contributeToCircle,
    cure: cureCircle,
    join: joinCircle,
  } = useCircles();
  const {
    goals,
    loaded: goalsLoaded,
    refresh: refreshGoals,
    create: createGoal,
    contribute: contributeToGoal,
    withdraw: withdrawFromGoal,
  } = useGoals();

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
        circles,
        refreshCircles,
        createCircle,
        contributeToCircle,
        cureCircle,
        joinCircle,
        goals,
        goalsLoaded,
        refreshGoals,
        createGoal,
        contributeToGoal,
        withdrawFromGoal,
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
