'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { polygon, polygonAmoy } from 'viem/chains';
import '@rainbow-me/rainbowkit/styles.css';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? 'YOUR_PROJECT_ID';

const config = getDefaultConfig({
  appName: 'PediScreen AI',
  projectId,
  chains: [polygonAmoy, polygon],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
