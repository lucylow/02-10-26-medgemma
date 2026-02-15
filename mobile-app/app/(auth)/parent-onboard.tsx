import React from 'react';
import { YStack, XStack, Text, Input, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';

export default function ParentOnboard() {
  const router = useRouter();

  return (
    <YStack flex={1} p="$6" jc="center" ai="center" bg="#F8FAFC">
      <YStack w="100%" maxW={400} space="$6">
        <XStack ai="center" jc="center" space="$3" mb="$4">
          <UserPlus size={40} color="#1E3A8A" />
          <Text fontSize="$9" fontWeight="900" color="#1E3A8A">
            Parent Onboarding
          </Text>
        </XStack>
        <Text fontSize="$5" color="#64748B" ta="center">
          Create account to start pediatric screening
        </Text>
        <Input
          placeholder="Child's name (optional)"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
        />
        <Input
          placeholder="Child's age (months)"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
          keyboardType="number-pad"
        />
        <Button
          size="$4"
          bg="#1E3A8A"
          color="white"
          br="$4"
          onPress={() => router.replace('/(tabs)/dashboard')}
        >
          Get Started
        </Button>
        <Button
          size="$4"
          variant="outlined"
          borderColor="#1E3A8A"
          color="#1E3A8A"
          br="$4"
          onPress={() => router.back()}
        >
          Back
        </Button>
      </YStack>
    </YStack>
  );
}
