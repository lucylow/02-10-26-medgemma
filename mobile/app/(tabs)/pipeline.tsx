import React, { useState } from "react";
import { YStack, XStack, Text, Card, Button, TextArea } from "tamagui";
import { router } from "expo-router";
import { postInfer } from "@/lib/api";
import { useHitlOrchestrator } from "@/hooks/useHitlOrchestrator";
import { useHitlNotifications } from "@/hooks/useHitlNotifications";
import { useAuth } from "@/contexts/AuthProvider";
import { Brain, Mic } from "lucide-react-native";

export default function Pipeline() {
  const { apiKey } = useAuth();
  const [observations, setObservations] = useState("");
  const [ageMonths, setAgeMonths] = useState("24");
  const [isRunning, setIsRunning] = useState(false);
  const [lastCaseId, setLastCaseId] = useState<string | null>(null);

  const caseId = lastCaseId ?? `case_${Date.now()}`;
  const { state, checkHitlRequired, makeDecision } = useHitlOrchestrator(
    caseId,
    { apiKey: apiKey ?? undefined }
  );
  const { notifyClinician } = useHitlNotifications();

  const runPipeline = async () => {
    if (!observations.trim()) return;
    setIsRunning(true);
    const id = `case_${Date.now()}`;
    setLastCaseId(id);

    try {
      const res = await postInfer(
        {
          case_id: id,
          age_months: parseInt(ageMonths, 10) || 24,
          observations: observations.trim(),
        },
        apiKey ?? undefined
      );

      const output = {
        summary:
          typeof res.result?.summary === "string"
            ? res.result.summary
            : (res.result?.summary as string[])?.[0] ?? "No summary",
        risk: (res.result?.risk ?? "monitor") as "low" | "monitor" | "elevated" | "discuss" | "refer",
        recommendations: res.result?.recommendations ?? [],
        parent_text: res.result?.parent_text ?? "",
        confidence: res.result?.confidence ?? 0.5,
      };

      const needsHitl = await checkHitlRequired(output);
      if (needsHitl) {
        await notifyClinician(id, output);
        router.push(`/hitl/${id}` as const);
      }
    } catch (err) {
      console.error(err);
      const mockOutput = {
        summary: "Mock: Monitor risk — few words at 24mo",
        risk: "monitor" as const,
        recommendations: ["Rescreen in 3 months", "Language modeling"],
        confidence: 0.82,
      };
      await checkHitlRequired(mockOutput);
      await notifyClinician(id, mockOutput);
      router.push(`/hitl/${id}` as const);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <YStack flex={1} padding="$6" backgroundColor="#F8FAFC" space="$6">
      <Text fontSize="$6" fontWeight="800" color="#1E293B">
        Live Agent + HITL
      </Text>
      <Text fontSize="$3" color="$gray11">
        Voice/Text → MedGemma Draft → HITL Gate → Clinician Review
      </Text>

      <Card padding="$4" backgroundColor="white" borderRadius="$4">
        <YStack space="$4">
          <YStack>
            <Text fontSize="$2" fontWeight="500" marginBottom="$2">
              Observations
            </Text>
            <TextArea
              value={observations}
              onChangeText={setObservations}
              placeholder="e.g. 24mo says 10 words"
              minHeight={80}
              backgroundColor="#F8FAFC"
              borderColor="#E2E8F0"
            />
          </YStack>
          <YStack>
            <Text fontSize="$2" fontWeight="500" marginBottom="$2">
              Age (months)
            </Text>
            <TextArea
              value={ageMonths}
              onChangeText={setAgeMonths}
              placeholder="24"
              minHeight={40}
              backgroundColor="#F8FAFC"
              borderColor="#E2E8F0"
            />
          </YStack>
          <Button
            size="$5"
            backgroundColor="#3B82F6"
            color="white"
            icon={<Mic size={20} color="white" />}
            onPress={runPipeline}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run MedGemma"}
          </Button>
        </YStack>
      </Card>

      {state.status === "pending_review" && (
        <Card padding="$4" backgroundColor="#FEF3C7" borderRadius="$4">
          <XStack alignItems="center" gap="$3">
            <Brain size={24} color="#D97706" />
            <Text fontSize="$3" fontWeight="600" color="#92400E">
              HITL triggered — navigate to Review to approve
            </Text>
          </XStack>
        </Card>
      )}
    </YStack>
  );
}
