import React, { useState } from "react";
import { YStack, XStack, Text, Button, Input } from "tamagui";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthProvider";
import { Stethoscope } from "lucide-react-native";

export default function ClinicianLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const handleLogin = () => {
    signIn(token || "demo-token", {
      id: "clinician-1",
      role: "clinician",
      email: email || "clinician@pediscreen.ai",
    });
    router.replace("/(tabs)/dashboard");
  };

  return (
    <YStack flex={1} padding="$6" backgroundColor="#F8FAFC" justifyContent="center">
      <YStack alignItems="center" marginBottom="$8">
        <Stethoscope size={48} color="#3B82F6" />
        <Text fontSize="$8" fontWeight="800" color="#1E293B" marginTop="$4">
          Clinician Portal
        </Text>
        <Text fontSize="$3" color="$gray11" marginTop="$2" textAlign="center">
          Sign in to review HITL cases and approve MedGemma drafts
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
            placeholder="clinician@pediscreen.ai"
            backgroundColor="white"
            borderColor="#E2E8F0"
          />
        </YStack>
        <YStack>
          <Text fontSize="$2" fontWeight="500" marginBottom="$2">
            Auth Token (optional)
          </Text>
          <Input
            value={token}
            onChangeText={setToken}
            placeholder="Bearer token for API"
            backgroundColor="white"
            borderColor="#E2E8F0"
            secureTextEntry
          />
        </YStack>
        <Button
          size="$5"
          backgroundColor="#3B82F6"
          color="white"
          onPress={handleLogin}
        >
          Sign In
        </Button>
        <XStack justifyContent="center" marginTop="$2">
          <Button
            variant="outlined"
            size="$3"
            onPress={() => router.push("/(auth)/parent")}
          >
            Parent Portal
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
