import React from 'react';
import { Text } from 'react-native';
import { YStack, Button } from 'tamagui';
import { ShieldAlert } from 'lucide-react-native';
import { useAuthState } from '@/contexts/AuthProvider';
import { useRouter } from 'expo-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'clinician' | 'admin';
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { userRole, hasAccess, isAuthenticated, isLoading } = useAuthState();
  const router = useRouter();

  if (isLoading) {
    return (
      <YStack flex={1} jc="center" ai="center" p="$8">
        <Text>Loading...</Text>
      </YStack>
    );
  }

  if (!isAuthenticated) {
    return (
      fallback || (
        <YStack flex={1} jc="center" ai="center" p="$8" space="$4">
          <ShieldAlert size={64} color="#1E3A8A" />
          <Text style={{ fontSize: 18, textAlign: 'center' }}>
            Sign in required
          </Text>
          <Button onPress={() => router.push('/(auth)/sign-in')}>
            Sign In
          </Button>
        </YStack>
      )
    );
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <YStack flex={1} jc="center" ai="center" p="$8" space="$4">
        <ShieldAlert size={64} color="#EF4444" />
        <Text style={{ fontSize: 18, textAlign: 'center' }}>
          Clinician access required
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#64748B' }}>
          Contact administrator for elevated permissions
        </Text>
      </YStack>
    );
  }

  if (requiredPermission && !hasAccess(requiredPermission)) {
    return (
      <YStack flex={1} jc="center" ai="center" p="$8" space="$4">
        <ShieldAlert size={64} color="#F59E0B" />
        <Text style={{ fontSize: 18, textAlign: 'center' }}>
          Insufficient permissions
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: '#64748B' }}>
          {requiredPermission.replace(/_/g, ' ')}
        </Text>
      </YStack>
    );
  }

  return <>{children}</>;
}
