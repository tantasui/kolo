"use client";

import { ClaimLink } from "@/components/screens/ClaimLink";
import { Providers } from "@/components/providers";
import { SetupNotice } from "@/components/SetupNotice";
import { missingConfig } from "@/config";

export default function ClaimPage() {
  const missing = missingConfig();
  if (missing.length > 0) return <SetupNotice missing={missing} />;

  return (
    <Providers>
      <ClaimLink />
    </Providers>
  );
}
