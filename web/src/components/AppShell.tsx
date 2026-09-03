"use client";

import { usePrivy } from "@privy-io/react-auth";
import { InstallPWA } from "./InstallPWA";
import { useKolo } from "./kolo-provider";
import { ClaimHandle } from "./screens/ClaimHandle";
import { Home } from "./screens/Home";
import { Landing } from "./screens/Landing";
import { Splash } from "./Splash";

/** Routes between the three states a user can be in. */
export function AppShell() {
  const { ready } = usePrivy();
  const { signedIn, accountReady, handleStatus } = useKolo();

  if (!ready) return <Splash />;
  if (!signedIn) return <Landing />;
  if (!accountReady || handleStatus === "loading") {
    return <Splash label="Getting things ready…" />;
  }
  if (handleStatus === "unregistered") return <ClaimHandle />;

  return (
    <>
      <Home />
      <InstallPWA />
    </>
  );
}
