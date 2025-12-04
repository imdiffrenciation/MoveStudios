import { PrivyProvider } from "@privy-io/react-auth";
import type { PrivyClientConfig } from '@privy-io/react-auth';

interface PrivyClientProviderProps {
  children: React.ReactNode;
}

export function PrivyClientProvider({ children }: PrivyClientProviderProps) {
  const privyConfig: PrivyClientConfig = {
    loginMethods: ['email', 'twitter', 'google', 'github', 'discord'],
    appearance: {
      showWalletLoginFirst: true,
      theme: 'dark',
    }
  };

  return (
    <PrivyProvider
      appId="cmiqf6jw1011tjv0c646skg10"
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
}
