import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import config from '@/tamagui.config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthProvider';
import { AIProvider } from '@/contexts/AIAgentProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <TamaguiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <AIProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#F8FAFC' },
                animation: 'slide_from_right',
              }}
            />
          </AIProvider>
        </QueryClientProvider>
      </TamaguiProvider>
    </AuthProvider>
  );
}
