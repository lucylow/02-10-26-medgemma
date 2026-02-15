import React from 'react';
import { YStack, Text, Button } from 'tamagui';
import { useRouter } from 'expo-router';

export default function NotFound() {
  const router = useRouter();

  return (
    <YStack flex={1} jc="center" ai="center" p="$6" bg="#F8FAFC">
      <Text fontSize="$9" fontWeight="900" color="#1E3A8A">
        404
      </Text>
      <Text fontSize="$5" color="#64748B" mt="$2" ta="center">
        Page not found
      </Text>
      <Button
        mt="$6"
        bg="#1E3A8A"
        color="white"
        onPress={() => router.replace('/(tabs)/dashboard')}
      >
        Go to Dashboard
      </Button>
    </YStack>
  );
}
