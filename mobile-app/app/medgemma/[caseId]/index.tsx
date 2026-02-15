import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { YStack, XStack, Text, Card, Badge } from 'tamagui';
import { useLocalSearchParams } from 'expo-router';
import { Brain, Activity, Target } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';

function ModelHeader() {
  return (
    <YStack space="$4">
      <XStack ai="center" space="$3">
        <Brain size={32} color="#1E3A8A" />
        <Text fontSize="$9" fontWeight="900" color="#1E3A8A">
          MedGemma 4B-IT (Pediatric)
        </Text>
        <Badge size="$3" bg="#3B82F6" color="white">
          QLoRA 4-bit
        </Badge>
      </XStack>
      <Text fontSize="$5" color="#64748B">
        Specialized medical reasoning • ASQ-3 validated • AAP 2025 guidelines
      </Text>
    </YStack>
  );
}

function LiveMedGemmaStream({
  streamedOutput,
  modelStats,
  isGenerating,
}: {
  streamedOutput: string;
  modelStats: { tokens: number; speed: number };
  isGenerating: boolean;
}) {
  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <XStack ai="center" space="$3" mb="$4">
        <Activity size={20} color="#3B82F6" />
        <Text fontSize="$5" fontWeight="700">
          Live Inference
        </Text>
        <View
          style={{
            flex: 1,
            height: 6,
            backgroundColor: '#E2E8F0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.min(100, (modelStats.tokens / 512) * 100)}%`,
              height: '100%',
              backgroundColor: '#3B82F6',
            }}
          />
        </View>
      </XStack>
      <Text
        fontSize="$4"
        lineHeight={24}
        color="#1E293B"
        fontFamily="monospace"
        minHeight={120}
      >
        {streamedOutput || 'Waiting for tokens...'}
      </Text>
      {isGenerating && (
        <Text fontSize="$4" color="#64748B" mt="$2">
          {modelStats.speed?.toFixed(0) ?? 0} tokens/sec • {modelStats.tokens} tokens
        </Text>
      )}
    </Card>
  );
}

function ModelMetrics({
  modelStats,
}: {
  modelStats: { tokens: number; speed: number };
}) {
  return (
    <XStack flexWrap="wrap" gap="$3">
      <Card p="$4" bg="white" br="$4" flex={1} minWidth={100}>
        <Text fontSize="$3" color="#64748B">Tokens</Text>
        <Text fontSize="$6" fontWeight="800" color="#1E3A8A">
          {modelStats.tokens}
        </Text>
      </Card>
      <Card p="$4" bg="white" br="$4" flex={1} minWidth={100}>
        <Text fontSize="$3" color="#64748B">Speed</Text>
        <Text fontSize="$6" fontWeight="800" color="#10B981">
          {modelStats.speed?.toFixed(0) ?? 0}/s
        </Text>
      </Card>
    </XStack>
  );
}

function StructuredOutputPreview({
  parsedOutput,
}: {
  parsedOutput: {
    risk: string;
    rationale: string;
    recommendations?: string[];
  } | null;
}) {
  if (!parsedOutput) return null;

  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <XStack ai="center" space="$2" mb="$4">
        <Target size={20} color="#10B981" />
        <Text fontSize="$5" fontWeight="700">
          Structured Output
        </Text>
      </XStack>
      <YStack space="$3">
        <XStack>
          <Text fontSize="$4" color="#64748B" w={80}>Risk:</Text>
          <Badge
            size="$3"
            bg={
              parsedOutput.risk === 'low'
                ? '#10B981'
                : parsedOutput.risk === 'elevated' || parsedOutput.risk === 'discuss'
                ? '#F59E0B'
                : '#3B82F6'
            }
            color="white"
          >
            {parsedOutput.risk}
          </Badge>
        </XStack>
        <Text fontSize="$4" color="#1E293B">
          {parsedOutput.rationale}
        </Text>
        {parsedOutput.recommendations?.length > 0 && (
          <YStack space="$1">
            <Text fontSize="$4" fontWeight="600" color="#64748B">
              Recommendations:
            </Text>
            {parsedOutput.recommendations.map((r, i) => (
              <Text key={i} fontSize="$4" color="#1E293B">
                • {r}
              </Text>
            ))}
          </YStack>
        )}
      </YStack>
    </Card>
  );
}

function parseOutputFromStream(stream: string) {
  try {
    const jsonMatch = stream.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      risk: parsed.risk ?? 'monitor',
      rationale: parsed.rationale ?? '',
      recommendations: parsed.recommendations ?? [],
    };
  } catch {
    return null;
  }
}

export default function MedGemmaScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { pipeline, isStreaming } = useAgentState();
  const medgemmaAgent = pipeline.find((a) => a.id === 'medgemma');
  const streamedOutput = (medgemmaAgent?.stream as string) ?? '';
  const parsedOutput = parseOutputFromStream(streamedOutput) ??
    (medgemmaAgent?.output ? {
      risk: (medgemmaAgent.output as { risk?: string }).risk ?? 'monitor',
      rationale: (medgemmaAgent.output as { rationale?: string }).rationale ?? '',
      recommendations: (medgemmaAgent.output as { recommendations?: string[] }).recommendations ?? [],
    } : null);
  const modelStats = {
    tokens: streamedOutput.length,
    speed: 0,
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack flex={1} p="$6" space="$6" bg="#F8FAFC">
        <ModelHeader />
        <LiveMedGemmaStream
          streamedOutput={streamedOutput}
          modelStats={modelStats}
          isGenerating={isStreaming}
        />
        <ModelMetrics modelStats={modelStats} />
        <StructuredOutputPreview parsedOutput={parsedOutput} />
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
