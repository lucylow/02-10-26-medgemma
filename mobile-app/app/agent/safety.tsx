import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, Text, Card } from 'tamagui';
import { Shield } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';

export default function SafetyAgentScreen() {
  const { pipeline } = useAgentState();
  const safety = pipeline.find((a) => a.id === 'safety');
  const output = safety?.output as { validated?: boolean } | undefined;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <YStack ai="center" space="$2">
          <Shield size={48} color="#10B981" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Safety Agent
          </Text>
          <Text fontSize="$4" color="#64748B">
            Guardrails & prohibited phrase checks
          </Text>
        </YStack>

        <Card p="$4" bg="white" br="$4" elevate>
          <YStack space="$3">
            <Text fontSize="$4" color="#64748B">
              Status: {safety?.status ?? 'pending'}
            </Text>
            <Text fontSize="$4" color="#1E293B">
              Validated: {output?.validated ? 'Yes' : 'No'}
            </Text>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
