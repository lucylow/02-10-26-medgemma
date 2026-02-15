import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Card, Input, Button } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useAgentState } from '@/hooks/useAgentState';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function OverrideScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const { pipeline } = useAgentState();
  const [rationale, setRationale] = useState('');
  const [overrideRisk, setOverrideRisk] = useState('');

  const medgemmaAgent = pipeline.find((a) => a.id === 'medgemma');
  const currentOutput = medgemmaAgent?.output as {
    risk?: string;
    rationale?: string;
    recommendations?: string[];
  } | undefined;

  const handleSignOff = () => {
    // FHIR + clinician sign-off would go here
    router.back();
  };

  return (
    <ProtectedRoute requiredPermission="override_ai">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <XStack ai="center" space="$3">
          <CheckCircle size={28} color="#10B981" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Clinician Review
          </Text>
        </XStack>

        <Card p="$4" bg="white" br="$4" elevate>
          <Text fontSize="$4" color="#64748B" mb="$2">
            Current risk: {currentOutput?.risk ?? '—'}
          </Text>
          <Input
            placeholder="Override risk (low/monitor/elevated/discuss)"
            value={overrideRisk}
            onChangeText={setOverrideRisk}
            size="$4"
            br="$4"
            mb="$3"
          />
          <Input
            placeholder="Clinician rationale"
            value={rationale}
            onChangeText={setRationale}
            size="$4"
            br="$4"
            multiline
            numberOfLines={4}
          />
        </Card>

        <Button
          size="$4"
          bg="#10B981"
          color="white"
          onPress={handleSignOff}
        >
          Sign Off & Complete
        </Button>

        <Card p="$4" bg="#F8FAFC" br="$4" onPress={() => router.back()}>
          <Text color="#3B82F6" fontWeight="600" ta="center">
            ← Back
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
