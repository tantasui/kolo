"use client";

import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/providers";
import { SetupNotice } from "@/components/SetupNotice";
import { missingConfig } from "@/config";

export default function Page() {
  // Checked before the providers mount: Privy cannot initialise without an
  // app id, so a missing .env.local should explain itself rather than crash.
  const missing = missingConfig();
  if (missing.length > 0) return <SetupNotice missing={missing} />;

  return (
    <Providers>
      <AppShell />
    </Providers>
  );
}
