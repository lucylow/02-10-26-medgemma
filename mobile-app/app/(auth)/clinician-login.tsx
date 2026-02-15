import React from 'react';
import { YStack, XStack, Text, Input, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Shield } from 'lucide-react-native';

export default function ClinicianLogin() {
  const router = useRouter();

  return (
    <YStack flex={1} p="$6" jc="center" ai="center" bg="#F8FAFC">
      <YStack w="100%" maxW={400} space="$6">
        <XStack ai="center" jc="center" space="$3" mb="$4">
          <Shield size={40} color="#1E3A8A" />
          <Text fontSize="$9" fontWeight="900" color="#1E3A8A">
            Clinician Login
          </Text>
        </XStack>
        <Text fontSize="$5" color="#64748B" ta="center">
          Sign in to access MedGemma pipeline and FHIR integration
        </Text>
        <Input
          placeholder="Email"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
        />
        <Input
          placeholder="Password"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
          secureTextEntry
        />
        <Button
          size="$4"
          bg="#1E3A8A"
          color="white"
          br="$4"
          onPress={() => router.replace('/(tabs)/dashboard')}
        >
          Sign In
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
