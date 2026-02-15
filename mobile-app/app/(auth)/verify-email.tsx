import React, { useState } from 'react';
import { YStack, Text, Input, Button } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!signUp || !isLoaded) return;
    setError('');
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      await setActive({ session: result.createdSessionId });
      router.replace('/(auth)/onboarding');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Verification failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <YStack flex={1} jc="center" ai="center" p="$8">
        <Text>Loading...</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} p="$6" jc="center" ai="center" bg="#F8FAFC">
      <YStack w="100%" maxW={400} space="$6">
        <Text fontSize="$8" fontWeight="800" color="#1E3A8A" ta="center">
          Verify your email
        </Text>
        <Text fontSize="$5" color="#64748B" ta="center">
          We sent a code to {email || 'your email'}
        </Text>
        <Input
          placeholder="Enter verification code"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />
        {error ? (
          <Text fontSize="$3" color="#EF4444" ta="center">
            {error}
          </Text>
        ) : null}
        <Button
          size="$4"
          bg="#1E3A8A"
          color="white"
          br="$4"
          onPress={handleVerify}
          disabled={loading || !code}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
      </YStack>
    </YStack>
  );
}
