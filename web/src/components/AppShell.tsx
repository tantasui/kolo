"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { isDueSoon } from "@/hooks/useCircles";
import { BottomNav, type Tab } from "./BottomNav";
import { InstallPWA } from "./InstallPWA";
import { useKolo } from "./kolo-provider";
import { ClaimHandle } from "./screens/ClaimHandle";
import { Circles } from "./screens/Circles";
import { Goals } from "./screens/Goals";
import { Pots } from "./screens/Pots";
import { Home } from "./screens/Home";
import { Landing } from "./screens/Landing";
import { Splash } from "./Splash";

/** Routes between the three states a user can be in. */
export function AppShell() {
  const { ready } = usePrivy();
  const { signedIn, accountReady, handleStatus, circles } = useKolo();
  const [tab, setTab] = useState<Tab>("home");

  if (!ready) return <Splash />;
  if (!signedIn) return <Landing />;
  if (!accountReady || handleStatus === "loading") {
    return <Splash label="Getting things ready…" />;
  }
  if (handleStatus === "unregistered") return <ClaimHandle />;

  return (
    <>
      {tab === "home" ? (
        <Home />
      ) : tab === "circles" ? (
        <Circles />
      ) : tab === "goals" ? (
        <Goals />
      ) : (
        <Pots />
      )}
      <BottomNav tab={tab} onChange={setTab} circlesNeedYou={circles.some(isDueSoon)} />
      <InstallPWA />
    </>
  );
}
