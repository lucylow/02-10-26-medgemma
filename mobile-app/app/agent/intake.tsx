import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, Text, Card } from 'tamagui';
import { Shield } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';

export default function IntakeAgentScreen() {
  const { pipeline } = useAgentState();
  const intake = pipeline.find((a) => a.id === 'intake');
  const output = intake?.output as {
    age_months?: number;
    observations?: string;
    domain?: string;
  } | undefined;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <YStack ai="center" space="$2">
          <Shield size={48} color="#1E3A8A" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Intake Agent
          </Text>
          <Text fontSize="$4" color="#64748B">
            Structures observations for MedGemma
          </Text>
        </YStack>

        <Card p="$4" bg="white" br="$4" elevate>
          <YStack space="$3">
            <Text fontSize="$4" color="#64748B">
              Age: {output?.age_months ?? '—'} months
            </Text>
            <Text fontSize="$4" color="#64748B">
              Domain: {output?.domain ?? '—'}
            </Text>
            <Text fontSize="$4" color="#1E293B">
              {output?.observations ?? 'No observations yet'}
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
