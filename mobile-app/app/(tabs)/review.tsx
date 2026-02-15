/**
 * HITL Review Queue - clinician review for low-confidence or elevated-risk cases.
 */

import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card, Badge } from 'tamagui';
import { useRouter } from 'expo-router';
import { ShieldAlert, FileText, ChevronRight } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';
import { RiskBadge } from '@/components/RiskBadge';
import type { RiskLevel } from '@/components/RiskBadge';

export default function ReviewQueue() {
  const router = useRouter();
  const { state } = useAgentState();

  const medgemmaAgent = state.pipeline.find((a) => a.id === 'medgemma');
  const output = medgemmaAgent?.output as
    | { risk?: RiskLevel; confidence?: number; summary?: string[] }
    | undefined;
  const needsReview =
    !!output &&
    ((output.confidence !== undefined && output.confidence < 0.85) ||
      output.risk === 'elevated' ||
      output.risk === 'discuss');

  const pendingCases = state.currentCaseId && needsReview
    ? [
        {
          caseId: state.currentCaseId,
          risk: (output?.risk ?? 'monitor') as RiskLevel,
          confidence: output?.confidence ?? 0.5,
          summary: output?.summary ?? [],
        },
      ]
    : [];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6" bg="#F8FAFC">
        <XStack ai="center" space="$3">
          <ShieldAlert size={28} color="#1E3A8A" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            HITL Review Queue
          </Text>
        </XStack>

        {/* Queue stats */}
        <XStack flexWrap="wrap" gap="$3">
          <Card flex={1} minWidth={100} p="$4" bg="white" br="$4" elevate>
            <Text fontSize="$3" color="#64748B">Pending</Text>
            <Text fontSize="$6" fontWeight="800" color="#F59E0B">
              {pendingCases.length}
            </Text>
          </Card>
          <Card flex={1} minWidth={100} p="$4" bg="white" br="$4" elevate>
            <Text fontSize="$3" color="#64748B">Avg Review</Text>
            <Text fontSize="$6" fontWeight="800" color="#10B981">
              2.3min
            </Text>
          </Card>
        </XStack>

        {pendingCases.length === 0 ? (
          <Card p="$6" bg="white" br="$4" elevate>
            <XStack ai="center" space="$4">
              <FileText size={40} color="#94A3B8" />
              <YStack flex={1}>
                <Text fontSize="$5" fontWeight="600" color="#64748B">
                  No pending cases
                </Text>
                <Text fontSize="$4" color="#94A3B8" mt="$1">
                  HITL cases will appear here when confidence &lt; 85% or risk is elevated
                </Text>
              </YStack>
            </XStack>
          </Card>
        ) : (
          <YStack space="$4">
            {pendingCases.map((caseItem) => (
              <TouchableOpacity
                key={caseItem.caseId}
                onPress={() => router.push(`/medgemma/${caseItem.caseId}`)}
              >
                <Card p="$4" bg="white" br="$4" elevate>
                  <XStack ai="center" jc="space-between">
                    <XStack ai="center" space="$3">
                      <FileText size={24} color="#3B82F6" />
                      <YStack>
                        <Text fontSize="$5" fontWeight="600" color="#1E293B">
                          Case #{caseItem.caseId.slice(-6)}
                        </Text>
                        <XStack ai="center" space="$2" mt="$1">
                          <RiskBadge
                            risk={caseItem.risk}
                            size="$1"
                            confidence={caseItem.confidence}
                          />
                        </XStack>
                      </YStack>
                    </XStack>
                    <ChevronRight size={20} color="#94A3B8" />
                  </XStack>
                </Card>
              </TouchableOpacity>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
