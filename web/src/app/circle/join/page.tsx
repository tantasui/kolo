"use client";

import { JoinCircle } from "@/components/screens/JoinCircle";
import { Providers } from "@/components/providers";
import { SetupNotice } from "@/components/SetupNotice";
import { missingConfig } from "@/config";

export default function JoinCirclePage() {
  const missing = missingConfig();
  if (missing.length > 0) return <SetupNotice missing={missing} />;

  return (
    <Providers>
      <JoinCircle />
    </Providers>
  );
}
