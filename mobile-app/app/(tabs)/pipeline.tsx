import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Brain, Activity } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';
import { AgentWorkflowViz } from '@/components/workflow/AgentWorkflowViz';
import type { AgentNode, WorkflowConnection } from '@/types/agentWorkflow';

function mapStatus(
  s: string
): 'idle' | 'running' | 'streaming' | 'success' | 'error' {
  if (s === 'pending' || s === 'offline') return 'idle';
  if (s === 'failed') return 'error';
  return s as 'running' | 'streaming' | 'success' | 'error';
}

function mapConnectionStatus(
  fromStatus: string,
  toStatus: string
): WorkflowConnection['status'] {
  if (fromStatus === 'success' && toStatus !== 'success') return 'active';
  if (fromStatus === 'success' && toStatus === 'success') return 'completed';
  if (fromStatus === 'failed' || toStatus === 'failed') return 'error';
  return 'idle';
}

export default function PipelineScreen() {
  const router = useRouter();
  const { state, resetPipeline } = useAgentState();

  const workflowPipeline = useMemo<AgentNode[]>(() => {
    return state.pipeline.map((a) => ({
      id: a.id,
      type: a.id as AgentNode['type'],
      status: mapStatus(a.status),
      position: { x: 0, y: 0 },
      confidence: a.confidence > 0 ? a.confidence : undefined,
      progress: a.progress,
    }));
  }, [state.pipeline]);

  const connections = useMemo<WorkflowConnection[]>(() => {
    const conns: WorkflowConnection[] = [];
    for (let i = 0; i < state.pipeline.length - 1; i++) {
      const from = state.pipeline[i];
      const to = state.pipeline[i + 1];
      conns.push({
        from: from.id,
        to: to.id,
        status: mapConnectionStatus(from.status, to.status),
      });
    }
    return conns;
  }, [state.pipeline]);

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
        <AgentWorkflowViz
          pipeline={workflowPipeline}
          connections={connections}
          onNodePress={(nodeId) => {
            const agent = state.pipeline.find((a) => a.id === nodeId);
            if (agent?.status === 'streaming' && state.currentCaseId) {
              router.push(`/medgemma/${state.currentCaseId}`);
            }
          }}
        />

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
