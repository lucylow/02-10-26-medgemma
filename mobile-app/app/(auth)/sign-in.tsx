import React, { useState } from 'react';
import { YStack, XStack, Text, Input, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { Shield } from 'lucide-react-native';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!signIn || !isLoaded) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      await setActive({ session: result.createdSessionId });
      router.replace('/(tabs)/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Sign in failed. Please try again.';
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
        <XStack ai="center" jc="center" space="$3" mb="$4">
          <Shield size={40} color="#1E3A8A" />
          <Text fontSize="$9" fontWeight="900" color="#1E3A8A">
            PediScreen AI
          </Text>
        </XStack>
        <Text fontSize="$5" color="#64748B" ta="center">
          Sign in to access MedGemma pipeline and pediatric screening
        </Text>
        <Input
          placeholder="Email"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          placeholder="Password"
          size="$4"
          br="$4"
          bg="white"
          borderColor="#E2E8F0"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
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
          onPress={handleSignIn}
          disabled={loading || !email || !password}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        <Button
          size="$4"
          variant="outlined"
          borderColor="#1E3A8A"
          color="#1E3A8A"
          br="$4"
          onPress={() => router.push('/(auth)/onboarding')}
        >
          Create Account
        </Button>
        <Button
          size="$4"
          chromeless
          color="#64748B"
          onPress={() => router.back()}
        >
          Back
        </Button>
      </YStack>
    </YStack>
  );
}
