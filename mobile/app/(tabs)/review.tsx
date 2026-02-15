import React from "react";
import { YStack, Text, ScrollView } from "tamagui";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthProvider";
import { usePendingHitlCases } from "@/hooks/usePendingHitlCases";
import { QueueStats } from "@/components/QueueStats";
import { HitlCaseCard } from "@/components/HitlCaseCard";
import { ShieldAlert } from "lucide-react-native";

function AccessDenied() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
      <ShieldAlert size={48} color="#EF4444" />
      <Text fontSize="$5" fontWeight="700" color="#1E293B" marginTop="$4">
        Access Denied
      </Text>
      <Text fontSize="$3" color="$gray11" marginTop="$2" textAlign="center">
        You need clinician access to review HITL cases.
      </Text>
    </YStack>
  );
}

export default function ReviewQueue() {
  const { hasAccess } = useAuth();
  const { data, isLoading } = usePendingHitlCases();

  if (!hasAccess("review_cases")) {
    return <AccessDenied />;
  }

  const cases = data?.cases ?? [];
  const pending = data?.pending ?? 0;
  const highPriority = data?.highPriority ?? 0;

  return (
    <YStack flex={1} padding="$6" backgroundColor="#F8FAFC" space="$6">
      <Text fontSize="$6" fontWeight="800" color="#1E293B">
        HITL Review Queue
      </Text>

      <QueueStats
        pending={pending}
        highPriority={highPriority}
        avgReviewTime="2.3min"
      />

      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack space="$4">
          {isLoading ? (
            <Text fontSize="$3" color="$gray10">
              Loading...
            </Text>
          ) : cases.length === 0 ? (
            <Text fontSize="$3" color="$gray10">
              No pending cases. New HITL cases will appear here.
            </Text>
          ) : (
            cases.map((caseItem: { caseId: string; risk?: string; confidence?: number; summary?: string }) => (
              <HitlCaseCard
                key={caseItem.caseId}
                caseData={caseItem}
                risk={caseItem.risk ?? "monitor"}
                confidence={caseItem.confidence ?? 0.5}
                onPress={() => router.push(`/hitl/${caseItem.caseId}` as const)}
              />
            ))
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
