import { useEffect } from "react";
import { router } from "expo-router";
import { YStack, Text, Spinner } from "tamagui";
import { useAuth } from "@/contexts/AuthProvider";

export default function Index() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/dashboard");
    } else {
      router.replace("/(auth)/clinician");
    }
  }, [user]);

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
      <Spinner size="large" color="white" />
      <Text color="white" marginTop="$4" fontSize="$4">
        PediScreen AI
      </Text>
    </YStack>
  );
}
