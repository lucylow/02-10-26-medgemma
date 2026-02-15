import React, { useState, useEffect } from "react";
import { YStack, XStack, Text, Card, ScrollView } from "tamagui";
import { Pressable } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Brain } from "lucide-react-native";
import { useHitlOrchestrator } from "@/hooks/useHitlOrchestrator";
import { useAuth } from "@/contexts/AuthProvider";
import { CaseHeader } from "@/components/CaseHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ClinicianDecisionButtons } from "@/components/ClinicianDecisionButtons";
import { ClinicianNotesInput } from "@/components/ClinicianNotesInput";
import { FeedbackSheet } from "@/components/FeedbackSheet";
import { AuditTrail } from "@/components/AuditTrail";

export default function HitlReviewScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { authToken, apiKey } = useAuth();
  const { state, makeDecision, subscribeToUpdates, setFeedback } =
    useHitlOrchestrator(caseId ?? "", { authToken: authToken ?? undefined, apiKey: apiKey ?? undefined });
  const [notes, setNotes] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (caseId) subscribeToUpdates();
  }, [caseId, subscribeToUpdates]);

  const output = state.agentOutput;
  const hasOutput = output?.summary != null && output.summary.length > 0;

  if (!caseId) {
    return (
      <YStack flex={1} padding="$6" justifyContent="center">
        <Text>No case ID</Text>
      </YStack>
    );
  }

  return (
    <ScrollView flex={1} backgroundColor="#F8FAFC" showsVerticalScrollIndicator={false}>
      <YStack padding="$6" space="$6" paddingBottom="$12">
        <CaseHeader
          caseId={caseId}
          risk={output?.risk ?? "monitor"}
          confidence={output?.confidence ?? 0}
        />

        <XStack space="$6" flexDirection={["column", "row"]}>
          <YStack flex={1} space="$4">
            <Card
              padding="$6"
              backgroundColor="white"
              borderRadius="$4"
              borderWidth={1}
              borderColor="#E2E8F0"
            >
              <XStack alignItems="center" space="$3" marginBottom="$4">
                <Brain size={24} color="#3B82F6" />
                <Text fontSize="$7" fontWeight="800" color="#1E293B">
                  MedGemma 4B-IT Draft
                </Text>
              </XStack>

              <RiskBadge
                risk={output?.risk ?? "monitor"}
                confidence={output?.confidence ?? 0}
              />

              <Text
                fontSize="$5"
                marginTop="$4"
                lineHeight={22}
                color="#334155"
              >
                {hasOutput ? output.summary : "Analyzing..."}
              </Text>

              {output?.recommendations && output.recommendations.length > 0 && (
                <YStack marginTop="$4" space="$2">
                  <Text fontSize="$3" fontWeight="600" color="#1E293B">
                    Recommendations
                  </Text>
                  {output.recommendations.map((rec, i) => (
                    <Text key={i} fontSize="$3" color="#64748B">
                      • {rec}
                    </Text>
                  ))}
                </YStack>
              )}
            </Card>
          </YStack>

          <YStack flex={1} space="$4">
            <ClinicianDecisionButtons
              onApprove={() => makeDecision("approve")}
              onReject={() => makeDecision("reject")}
              onEdit={() => makeDecision("edit", notes)}
              onEscalate={() => makeDecision("escalate")}
              disabled={state.status !== "pending_review"}
            />

            <ClinicianNotesInput
              value={notes}
              onChange={setNotes}
              placeholder="Add clinical notes or corrections..."
            />

            <Pressable onPress={() => setShowFeedback(true)}>
              <Card padding="$4" backgroundColor="white" borderRadius="$3">
                <Text fontSize="$3" color="$gray11">
                  Rate AI output quality →
                </Text>
              </Card>
            </Pressable>
          </YStack>
        </XStack>

        <AuditTrail events={state.auditTrail} />
      </YStack>

      <FeedbackSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmit={(score) => {
          setFeedback(score);
          setShowFeedback(false);
        }}
      />
    </ScrollView>
  );
}
