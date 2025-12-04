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
      appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
      clientId={import.meta.env.VITE_PRIVY_CLIENT_ID || ""}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  );
}
