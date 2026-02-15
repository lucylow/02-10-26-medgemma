import React from 'react';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { UserPlus, Shield, Users } from 'lucide-react-native';

/**
 * Role selection for new users. In production, role is set via Clerk
 * Dashboard or backend API. This screen collects intent for demo.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useUser();

  const handleRoleSelect = (role: 'parent' | 'clinician') => {
    // In production: call backend to set user.publicMetadata.role
    // For now, navigate to dashboard - role defaults to 'parent'
    router.replace('/(tabs)/dashboard');
  };

  return (
    <YStack flex={1} p="$6" jc="center" ai="center" bg="#F8FAFC">
      <YStack w="100%" maxW={400} space="$6">
        <XStack ai="center" jc="center" space="$3" mb="$4">
          <UserPlus size={40} color="#1E3A8A" />
          <Text fontSize="$9" fontWeight="900" color="#1E3A8A">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
          </Text>
        </XStack>
        <Text fontSize="$5" color="#64748B" ta="center">
          How will you use PediScreen AI?
        </Text>

        <Card
          p="$5"
          bg="white"
          br="$4"
          elevate
          borderWidth={1}
          borderColor="#E2E8F0"
          onPress={() => handleRoleSelect('parent')}
          pressStyle={{ opacity: 0.9 }}
        >
          <XStack ai="center" space="$4">
            <Users size={32} color="#10B981" />
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="700" color="#1E293B">
                Parent / Guardian
              </Text>
              <Text fontSize="$4" color="#64748B">
                Screen your child, view summaries
              </Text>
            </YStack>
          </XStack>
        </Card>

        <Card
          p="$5"
          bg="white"
          br="$4"
          elevate
          borderWidth={1}
          borderColor="#E2E8F0"
          onPress={() => handleRoleSelect('clinician')}
          pressStyle={{ opacity: 0.9 }}
        >
          <XStack ai="center" space="$4">
            <Shield size={32} color="#1E3A8A" />
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="700" color="#1E293B">
                Clinician
              </Text>
              <Text fontSize="$4" color="#64748B">
                Full pipeline, evidence chain, override
              </Text>
            </YStack>
          </XStack>
        </Card>

        <Button
          size="$4"
          chromeless
          color="#64748B"
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          Sign out
        </Button>
      </YStack>
    </YStack>
  );
}
