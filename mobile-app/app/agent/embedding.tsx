import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, Text, Card } from 'tamagui';
import { Zap } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';

export default function EmbeddingAgentScreen() {
  const { pipeline } = useAgentState();
  const embedding = pipeline.find((a) => a.id === 'embedding');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <YStack ai="center" space="$2">
          <Zap size={48} color="#F59E0B" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Embedding Agent
          </Text>
          <Text fontSize="$4" color="#64748B">
            Vector similarity for retrieval
          </Text>
        </YStack>

        <Card p="$4" bg="white" br="$4" elevate>
          <Text fontSize="$4" color="#64748B">
            Status: {embedding?.status ?? 'pending'}
          </Text>
          <Text fontSize="$4" color="#94A3B8" mt="$2">
            Embedding runs server-side. Output used for MedGemma context.
          </Text>
        </Card>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
