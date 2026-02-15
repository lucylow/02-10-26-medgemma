import React from "react";
import { XStack, YStack, Text } from "tamagui";
import type { RiskLevel } from "@/types/hitl";

interface CaseHeaderProps {
  caseId: string;
  risk: RiskLevel;
  confidence: number;
}

const riskColors: Record<string, string> = {
  low: "#10B981",
  monitor: "#F59E0B",
  elevated: "#F59E0B",
  discuss: "#EF4444",
  refer: "#EF4444",
};

export function CaseHeader({ caseId, risk, confidence }: CaseHeaderProps) {
  const color = riskColors[risk?.toLowerCase() ?? "monitor"] ?? "#64748B";

  return (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      padding="$4"
      backgroundColor="white"
      borderRadius="$4"
    >
      <YStack>
        <Text fontSize="$5" fontWeight="700" color="#1E293B">
          Case {caseId.slice(-8)}
        </Text>
        <Text fontSize="$2" color="$gray10">
          Pending clinician review
        </Text>
      </YStack>
      <XStack gap="$3" alignItems="center">
        <YStack alignItems="flex-end">
          <Text fontSize="$1" color="$gray10">
            Risk
          </Text>
          <Text fontSize="$4" fontWeight="700" color={color} textTransform="capitalize">
            {risk}
          </Text>
        </YStack>
        <YStack alignItems="flex-end">
          <Text fontSize="$1" color="$gray10">
            Confidence
          </Text>
          <Text fontSize="$4" fontWeight="700" color="#3B82F6">
            {Math.round(confidence * 100)}%
          </Text>
        </YStack>
      </XStack>
    </XStack>
  );
}
