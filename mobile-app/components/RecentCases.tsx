/**
 * Recent cases list for dashboard.
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { useRouter } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';

export function RecentCases() {
  const router = useRouter();
  const { state } = useAgentState();

  if (!state.currentCaseId) {
    return (
      <Card p="$6" bg="white" br="$4" elevate>
        <XStack ai="center" space="$4">
          <FileText size={32} color="#94A3B8" />
          <YStack flex={1}>
            <Text fontSize="$5" fontWeight="600" color="#64748B">
              No recent cases
            </Text>
            <Text fontSize="$4" color="#94A3B8" mt="$1">
              Start a screening to see cases here
            </Text>
          </YStack>
        </XStack>
      </Card>
    );
  }

  return (
    <YStack space="$3">
      <Text fontSize="$6" fontWeight="700" color="#1E293B">
        Recent Cases
      </Text>
      <TouchableOpacity
        onPress={() => router.push(`/medgemma/${state.currentCaseId}`)}
      >
        <Card p="$4" bg="white" br="$4" elevate>
          <XStack ai="center" jc="space-between">
            <XStack ai="center" space="$3">
              <FileText size={24} color="#3B82F6" />
              <YStack>
                <Text fontSize="$5" fontWeight="600" color="#1E293B">
                  Case #{state.currentCaseId.slice(-6)}
                </Text>
                <Text fontSize="$3" color="#64748B">
                  MedGemma pipeline
                </Text>
              </YStack>
            </XStack>
            <ChevronRight size={20} color="#94A3B8" />
          </XStack>
        </Card>
      </TouchableOpacity>
    </YStack>
  );
}
