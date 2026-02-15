import React from "react";
import { XStack, Text } from "tamagui";
import type { RiskLevel } from "@/types/hitl";

interface RiskBadgeProps {
  risk: RiskLevel;
  confidence: number;
}

const riskConfig: Record<string, { bg: string; color: string }> = {
  low: { bg: "#D1FAE5", color: "#059669" },
  monitor: { bg: "#FEF3C7", color: "#D97706" },
  elevated: { bg: "#FEF3C7", color: "#D97706" },
  discuss: { bg: "#FEE2E2", color: "#DC2626" },
  refer: { bg: "#FEE2E2", color: "#DC2626" },
};

export function RiskBadge({ risk, confidence }: RiskBadgeProps) {
  const config = riskConfig[risk?.toLowerCase() ?? "monitor"] ?? riskConfig.monitor;

  return (
    <XStack
      alignSelf="flex-start"
      paddingHorizontal="$3"
      paddingVertical="$1.5"
      backgroundColor={config.bg}
      borderRadius="$2"
      gap="$2"
    >
      <Text fontSize="$2" fontWeight="600" color={config.color} textTransform="capitalize">
        {risk}
      </Text>
      <Text fontSize="$2" color={config.color}>
        •
      </Text>
      <Text fontSize="$2" color={config.color}>
        {Math.round(confidence * 100)}% confidence
      </Text>
    </XStack>
  );
}
