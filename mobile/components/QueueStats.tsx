import React from "react";
import { XStack, YStack, Text, Card } from "tamagui";

interface QueueStatsProps {
  pending: number;
  highPriority: number;
  avgReviewTime: string;
}

export function QueueStats({
  pending,
  highPriority,
  avgReviewTime,
}: QueueStatsProps) {
  return (
    <XStack space="$4" flexWrap="wrap">
      <Card flex={1} minWidth={100} padding="$4" backgroundColor="#3B82F6">
        <YStack>
          <Text fontSize="$2" color="rgba(255,255,255,0.8)">
            Pending
          </Text>
          <Text fontSize="$7" fontWeight="800" color="white">
            {pending}
          </Text>
        </YStack>
      </Card>
      <Card flex={1} minWidth={100} padding="$4" backgroundColor="#EF4444">
        <YStack>
          <Text fontSize="$2" color="rgba(255,255,255,0.8)">
            High Priority
          </Text>
          <Text fontSize="$7" fontWeight="800" color="white">
            {highPriority}
          </Text>
        </YStack>
      </Card>
      <Card flex={1} minWidth={100} padding="$4" backgroundColor="#10B981">
        <YStack>
          <Text fontSize="$2" color="rgba(255,255,255,0.8)">
            Avg Review
          </Text>
          <Text fontSize="$5" fontWeight="700" color="white">
            {avgReviewTime}
          </Text>
        </YStack>
      </Card>
    </XStack>
  );
}
