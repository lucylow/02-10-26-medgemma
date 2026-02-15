import React from "react";
import { YStack, XStack, Text, Card, Button } from "tamagui";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthProvider";
import { usePendingHitlCases } from "@/hooks/usePendingHitlCases";
import { QueueStats } from "@/components/QueueStats";
import { Activity, ClipboardCheck, AlertTriangle } from "lucide-react-native";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { data } = usePendingHitlCases();

  const pending = data?.pending ?? 0;
  const highPriority = data?.highPriority ?? 0;

  return (
    <YStack flex={1} padding="$6" backgroundColor="#F8FAFC" space="$6">
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <Text fontSize="$6" fontWeight="800" color="#1E293B">
            HITL Dashboard
          </Text>
          <Text fontSize="$3" color="$gray11">
            {user?.role === "clinician" ? "Clinician" : "Parent"} • PediScreen AI
          </Text>
        </YStack>
        <Button size="$3" variant="outlined" onPress={signOut}>
          Sign Out
        </Button>
      </XStack>

      <QueueStats
        pending={pending}
        highPriority={highPriority}
        avgReviewTime="2.3min"
      />

      <YStack space="$4">
        <Text fontSize="$5" fontWeight="700" color="#1E293B">
          Quick Actions
        </Text>
        <XStack space="$4" flexWrap="wrap">
          <Pressable onPress={() => router.push("/(tabs)/review")} style={{ flex: 1, minWidth: 140 }}>
            <Card flex={1} padding="$4" backgroundColor="white" borderRadius="$4">
              <YStack alignItems="center" space="$2">
                <ClipboardCheck size={32} color="#3B82F6" />
                <Text fontSize="$3" fontWeight="600">
                  Review Queue
                </Text>
                <Text fontSize="$2" color="$gray10">
                  {pending} pending
                </Text>
              </YStack>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/pipeline")} style={{ flex: 1, minWidth: 140 }}>
            <Card flex={1} padding="$4" backgroundColor="white" borderRadius="$4">
              <YStack alignItems="center" space="$2">
                <Activity size={32} color="#10B981" />
                <Text fontSize="$3" fontWeight="600">
                  Live Pipeline
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Agent + HITL
                </Text>
              </YStack>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/cases")} style={{ flex: 1, minWidth: 140 }}>
            <Card flex={1} padding="$4" backgroundColor="white" borderRadius="$4">
              <YStack alignItems="center" space="$2">
                <AlertTriangle size={32} color="#F59E0B" />
                <Text fontSize="$3" fontWeight="600">
                  Audit Trail
                </Text>
                <Text fontSize="$2" color="$gray10">
                  Cases
                </Text>
              </YStack>
            </Card>
          </Pressable>
        </XStack>
      </YStack>
    </YStack>
  );
}
