"use client";

import { ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Use MAINNET for dappConfig to prevent SDK wallets from crashing
  // The actual network (Movement Testnet) is handled by the external wallet (Nightly)
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      optInWallets={["Nightly", "Pontem Wallet", "Petra"]}
      dappConfig={{
        network: Network.MAINNET,
      }}
      onError={(error) => {
        console.error("Wallet error:", JSON.stringify(error, null, 2));
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
