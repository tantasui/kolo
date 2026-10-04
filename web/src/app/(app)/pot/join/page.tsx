"use client";

import { JoinPot } from "@/components/screens/JoinPot";
import { Providers } from "@/components/providers";
import { SetupNotice } from "@/components/SetupNotice";
import { missingConfig } from "@/config";

export default function JoinPotPage() {
  const missing = missingConfig();
  if (missing.length > 0) return <SetupNotice missing={missing} />;

  return (
    <Providers>
      <JoinPot />
    </Providers>
  );
}
