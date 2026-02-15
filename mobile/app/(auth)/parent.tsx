import React, { useState } from "react";
import { YStack, Text, Button, Input } from "tamagui";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthProvider";
import { Baby } from "lucide-react-native";

export default function ParentPortal() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");

  const handleLogin = () => {
    signIn("parent-token", {
      id: "parent-1",
      role: "parent",
      email: email || "parent@example.com",
    });
    router.replace("/(tabs)/dashboard");
  };

  return (
    <YStack flex={1} padding="$6" backgroundColor="#F8FAFC" justifyContent="center">
      <YStack alignItems="center" marginBottom="$8">
        <Baby size={48} color="#10B981" />
        <Text fontSize="$8" fontWeight="800" color="#1E293B" marginTop="$4">
          Parent Portal
        </Text>
        <Text fontSize="$3" color="$gray11" marginTop="$2" textAlign="center">
          Submit screenings and view results
        </Text>
      </YStack>
      <YStack space="$4">
        <YStack>
          <Text fontSize="$2" fontWeight="500" marginBottom="$2">
            Email
          </Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="parent@example.com"
            backgroundColor="white"
            borderColor="#E2E8F0"
          />
        </YStack>
        <Button
          size="$5"
          backgroundColor="#10B981"
          color="white"
          onPress={handleLogin}
        >
          Continue
        </Button>
        <Button
          variant="outlined"
          size="$3"
          onPress={() => router.back()}
        >
          Back to Clinician
        </Button>
      </YStack>
    </YStack>
  );
}
