import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText, Shield, Brain, Zap } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const agentIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  intake: Shield,
  embedding: Zap,
  medgemma: Brain,
  safety: Shield,
  summarizer: FileText,
};

export default function EvidenceScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const { pipeline } = useAgentState();

  return (
    <ProtectedRoute requiredPermission="view_evidence">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <XStack ai="center" jc="space-between">
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Agent Chain Evidence
          </Text>
          <Text fontSize="$4" color="#64748B">
            #{caseId?.slice(-6) ?? '—'}
          </Text>
        </XStack>

        {pipeline.map((agent) => {
          const Icon = agentIcons[agent.id] ?? FileText;
          return (
            <Card key={agent.id} p="$4" bg="white" br="$4" elevate>
              <XStack ai="center" space="$3" mb="$2">
                <Icon size={22} color="#1E3A8A" />
                <Text fontSize="$5" fontWeight="700">
                  {agent.id}
                </Text>
                <Text fontSize="$3" color="#64748B">
                  {agent.status}
                </Text>
              </XStack>
              {Object.keys(agent.output || {}).length > 0 && (
                <Text fontSize="$4" color="#1E293B" lineHeight={22}>
                  {JSON.stringify(agent.output, null, 2).slice(0, 500)}...
                </Text>
              )}
            </Card>
          );
        })}

        <Card p="$4" bg="#F8FAFC" br="$4" onPress={() => router.back()}>
          <Text color="#3B82F6" fontWeight="600" ta="center">
            ← Back to streaming
          </Text>
        </Card>
      </YStack>
    </ScrollView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
