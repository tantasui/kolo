"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { createSmartAccountClient, type SmartAccountClient } from "permissionless";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { config } from "@/config";

/**
 * Wires the Privy signer to a gas-sponsored account, following Monad's
 * next-serwist-privy-smart-wallet template. Nothing in the UI ever refers to
 * any of this -- it exists so that a tap costs the user nothing and asks
 * them to confirm nothing.
 */
interface SmartWalletContextValue {
  /** The user's account address. Never shown in the UI. */
  address: `0x${string}` | null;
  ready: boolean;
  client: SmartAccountClient | null;
}

const SmartWalletContext = createContext<SmartWalletContextValue>({
  address: null,
  ready: false,
  client: null,
});

export const useSmartWallet = () => useContext(SmartWalletContext);

export function SmartWalletProvider({ children }: { children: React.ReactNode }) {
  const { ready: privyReady, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<SmartAccountClient | null>(null);

  const signerWallet = wallets.find((wallet) => wallet.walletClientType === "privy");
  const signerAddress = signerWallet?.address;

  useEffect(() => {
    let cancelled = false;

    async function initialise(wallet: ConnectedWallet) {
      try {
        const provider = await wallet.getEthereumProvider();

        const signer = createWalletClient({
          account: wallet.address as `0x${string}`,
          chain: config.chain,
          transport: custom(provider),
        });

        const publicClient = createPublicClient({
          chain: config.chain,
          transport: http(config.rpcUrl),
        });

        const account = await toKernelSmartAccount({
          client: publicClient,
          entryPoint: { address: entryPoint07Address, version: "0.7" },
          owners: [signer],
          version: "0.3.1",
        });

        const pimlico = createPimlicoClient({
          transport: http(config.bundlerUrl),
          entryPoint: { address: entryPoint07Address, version: "0.7" },
        });

        const smartAccountClient = createSmartAccountClient({
          account,
          chain: config.chain,
          bundlerTransport: http(config.bundlerUrl),
          paymaster: pimlico,
          userOperation: {
            estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast,
          },
        });

        if (cancelled) return;

        setClient(smartAccountClient);
        setAddress(smartAccountClient.account.address);
        setReady(true);
      } catch (error) {
        console.error("[kolo] smart account init failed", error);
        if (!cancelled) setReady(false);
      }
    }

    if (!privyReady) return;

    if (!authenticated || !signerWallet) {
      setClient(null);
      setAddress(null);
      setReady(false);
      return;
    }

    initialise(signerWallet);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privyReady, authenticated, signerAddress]);

  return (
    <SmartWalletContext.Provider value={{ address, ready, client }}>
      {children}
    </SmartWalletContext.Provider>
  );
}
