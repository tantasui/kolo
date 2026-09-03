"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { config } from "@/config";
import { SmartWalletProvider } from "@/hooks/useSmartWallet";
import { KoloProvider } from "./kolo-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={config.privy.appId}
      clientId={config.privy.clientId}
      config={{
        // Email or passkey only -- there is nothing for a user to connect.
        loginMethods: ["email", "passkey"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: false,
        },
        defaultChain: config.chain,
        supportedChains: [config.chain],
        appearance: {
          theme: "dark",
          accentColor: "#D2FF3A",
          landingHeader: "Sign in to Kolo",
          showWalletLoginFirst: false,
          walletList: [],
        },
      }}
    >
      <SmartWalletProvider>
        <KoloProvider>{children}</KoloProvider>
      </SmartWalletProvider>
    </PrivyProvider>
  );
}
