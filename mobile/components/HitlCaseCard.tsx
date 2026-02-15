import React from "react";
import { Card, YStack, XStack, Text, Pressable } from "tamagui";
import { ChevronRight } from "lucide-react-native";

interface HitlCaseCardProps {
  caseData: {
    caseId: string;
    risk?: string;
    confidence?: number;
    summary?: string;
    createdAt?: string;
  };
  risk: string;
  confidence: number;
  onPress: () => void;
}

const riskColors: Record<string, string> = {
  low: "#10B981",
  monitor: "#F59E0B",
  elevated: "#F59E0B",
  discuss: "#EF4444",
  refer: "#EF4444",
};

export function HitlCaseCard({
  caseData,
  risk,
  confidence,
  onPress,
}: HitlCaseCardProps) {
  const color = riskColors[risk?.toLowerCase() ?? "monitor"] ?? "#64748B";

  return (
    <Pressable onPress={onPress}>
      <Card
        padding="$4"
        backgroundColor="white"
        borderRadius="$4"
        borderWidth={1}
        borderColor="#E2E8F0"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="700" color="#1E293B">
              Case {caseData.caseId?.slice(-8) ?? "—"}
            </Text>
            {caseData.summary && (
              <Text
                fontSize="$2"
                color="$gray11"
                numberOfLines={2}
                marginTop="$1"
              >
                {caseData.summary}
              </Text>
            )}
            <XStack marginTop="$2" gap="$3">
              <Text
                fontSize="$2"
                fontWeight="600"
                color={color}
                textTransform="capitalize"
              >
                {risk}
              </Text>
              <Text fontSize="$2" color="$gray10">
                {Math.round(confidence * 100)}% conf
              </Text>
            </XStack>
          </YStack>
          <ChevronRight size={24} color="#94A3B8" />
        </XStack>
      </Card>
    </Pressable>
  );
}
