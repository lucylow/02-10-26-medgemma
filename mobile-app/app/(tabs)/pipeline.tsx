import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Brain, Shield, Zap, Target, Activity } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';

const agentIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  intake: Shield,
  embedding: Zap,
  medgemma: Brain,
  safety: Shield,
  summarizer: Target,
};

const statusColors: Record<string, string> = {
  pending: '#E2E8F0',
  running: '#F59E0B',
  streaming: '#3B82F6',
  success: '#10B981',
  failed: '#EF4444',
  offline: '#64748B',
};

export default function PipelineScreen() {
  const router = useRouter();
  const { state, resetPipeline } = useAgentState();

  if (!state.currentCaseId) {
    return (
      <YStack flex={1} p="$6" jc="center" ai="center" bg="#F8FAFC">
        <Brain size={64} color="#94A3B8" />
        <Text fontSize="$6" fontWeight="700" color="#64748B" mt="$4" ta="center">
          No active pipeline
        </Text>
        <Text fontSize="$4" color="#94A3B8" ta="center" mt="$2">
          Start a screening from the dashboard to see the agent pipeline
        </Text>
        <Button
          mt="$6"
          bg="#1E3A8A"
          color="white"
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          Go to Dashboard
        </Button>
      </YStack>
    );
  }

  const medgemmaAgent = state.pipeline.find((a) => a.id === 'medgemma');
  const hasStreaming = state.isStreaming && medgemmaAgent?.status === 'streaming';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$4" space="$6">
        <XStack ai="center" jc="space-between">
          <Text fontSize="$6" fontWeight="800" color="#1E293B">
            Agent Pipeline
          </Text>
          <Text fontSize="$4" color="#64748B">
            #{state.currentCaseId.slice(-6)}
          </Text>
        </XStack>

        <XStack flexWrap="wrap" gap="$3" jc="center">
          {state.pipeline.map((agent) => {
            const Icon = agentIcons[agent.id] ?? Brain;
            const bg = statusColors[agent.status] ?? statusColors.pending;
            return (
              <Card
                key={agent.id}
                minWidth={140}
                maxWidth={180}
                p="$4"
                bg={bg}
                br="$4"
                elevate
              >
                <XStack ai="center" space="$3">
                  <YStack
                    w={44}
                    h={44}
                    br={22}
                    bg="rgba(255,255,255,0.3)"
                    ai="center"
                    jc="center"
                  >
                    <Icon size={22} color="white" />
                  </YStack>
                  <YStack flex={1}>
                    <Text
                      color="white"
                      fontWeight="700"
                      fontSize="$3"
                      textTransform="uppercase"
                    >
                      {agent.id}
                    </Text>
                    <Text color="rgba(255,255,255,0.9)" fontSize="$2">
                      {agent.status}
                    </Text>
                    {agent.confidence > 0 && (
                      <Text color="rgba(255,255,255,0.9)" fontSize="$2">
                        {Math.round(agent.confidence * 100)}%
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </Card>
            );
          })}
        </XStack>

        {hasStreaming && medgemmaAgent && (
          <Card p="$4" bg="white" br="$4" elevate>
            <XStack ai="center" space="$2" mb="$2">
              <Activity size={18} color="#3B82F6" />
              <Text fontSize="$5" fontWeight="700">
                MedGemma Live Output
              </Text>
            </XStack>
            <Text fontSize="$4" color="#1E293B" lineHeight={22}>
              {(medgemmaAgent.stream as string) || 'Streaming...'}
            </Text>
          </Card>
        )}

        <XStack space="$3" jc="center">
          <Button
            variant="outlined"
            borderColor="#64748B"
            color="#64748B"
            onPress={() => resetPipeline()}
          >
            Reset
          </Button>
          <TouchableOpacity onPress={() => router.push(`/medgemma/${state.currentCaseId}`)}>
            <Button bg="#1E3A8A" color="white">
              View Full Screen
            </Button>
          </TouchableOpacity>
        </XStack>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
