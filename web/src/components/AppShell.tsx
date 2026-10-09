"use client";

import { useEffect, useState } from "react";
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
import { Welcome } from "./screens/Welcome";
import { Splash } from "./Splash";
import { hasSeenWelcome } from "@/lib/welcome";

/** Routes between the states a user can be in. */
export function AppShell() {
  const { ready } = usePrivy();
  const { signedIn, accountReady, handleStatus, circles } = useKolo();
  const [tab, setTab] = useState<Tab>("home");

  /**
   * Whether the welcome still has to be shown. `null` until the effect has
   * read storage, so the first paint never flashes the landing screen at
   * somebody who is about to be shown the welcome instead. Read in an effect
   * rather than in useState because localStorage does not exist on the server.
   */
  const [welcomePending, setWelcomePending] = useState<boolean | null>(null);
  useEffect(() => setWelcomePending(!hasSeenWelcome()), []);

  if (!ready || welcomePending === null) return <Splash />;
  if (!signedIn) {
    return welcomePending ? (
      <Welcome onDone={() => setWelcomePending(false)} />
    ) : (
      <Landing />
    );
  }
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
      <BottomNav
        tab={tab}
        onChange={setTab}
        circlesNeedYou={circles.some(isDueSoon)}
      />
      <InstallPWA />
    </>
  );
}
