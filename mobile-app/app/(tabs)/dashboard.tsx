import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { YStack, XStack, Text, Card, Badge } from 'tamagui';
import { useRouter } from 'expo-router';
import { Brain, Activity, Zap } from 'lucide-react-native';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';

const clinicianCards = (
  currentCaseId: string | null
) => [
  {
    title: 'Live Inference',
    value: '—',
    suffix: '/sec',
    color: '#3B82F6',
    route: currentCaseId ? `/medgemma/${currentCaseId}` : null,
  },
  {
    title: 'QLoRA Accuracy',
    value: '95%',
    color: '#10B981',
  },
  {
    title: 'Pending Review',
    value: '0',
    color: '#F59E0B',
  },
];

export default function MedGemmaDashboard() {
  const router = useRouter();
  const { startFullPipeline, state } = useAgentOrchestrator();
  const { width } = useWindowDimensions();

  const handleQuickStart = async () => {
    const caseId = await startFullPipeline({
      age: 24,
      observations: 'Says 10 words, points to objects',
    });
    router.push(`/medgemma/${caseId}`);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <YStack space="$6" p="$4">
        {/* HERO MEDGEMMA STATS */}
        <YStack space="$4">
          <XStack ai="center" space="$3">
            <Brain size={32} color="#1E3A8A" />
            <Text fontSize="$8" fontWeight="900" color="#1E3A8A">
              MedGemma 4B-IT
            </Text>
            <Badge size="$3" bg="#3B82F6" color="white">
              QLoRA 4-bit
            </Badge>
          </XStack>
          <Text fontSize="$5" color="#64748B">
            Pediatric screening • ASQ-3 validated • AAP 2025 guidelines
          </Text>
        </YStack>

        {/* QUICK STATS */}
        <XStack flexWrap="wrap" gap="$3">
          {clinicianCards(state.currentCaseId).map((card) => (
            <Card
              key={card.title}
              flex={1}
              minWidth={width > 400 ? 120 : width / 3 - 16}
              p="$4"
              bg="white"
              br="$4"
              elevate
              onPress={
                card.route
                  ? () => router.push(card.route!)
                  : undefined
              }
              pressStyle={{ opacity: 0.9 }}
            >
              <YStack space="$1">
                <Text fontSize="$4" color="#64748B">
                  {card.title}
                </Text>
                <XStack ai="baseline">
                  <Text fontSize="$7" fontWeight="800" color={card.color}>
                    {card.value}
                  </Text>
                  {card.suffix && (
                    <Text fontSize="$3" color="#64748B" ml="$1">
                      {card.suffix}
                    </Text>
                  )}
                </XStack>
              </YStack>
            </Card>
          ))}
        </XStack>

        {/* QUICK ACTIONS */}
        <YStack space="$3">
          <Text fontSize="$6" fontWeight="700" color="#1E293B">
            Quick Actions
          </Text>
          <TouchableOpacity onPress={handleQuickStart}>
            <Card p="$4" bg="#1E3A8A" br="$4" elevate>
              <XStack ai="center" space="$3">
                <Zap size={24} color="white" />
                <YStack flex={1}>
                  <Text color="white" fontWeight="700" fontSize="$5">
                    Start New Screening
                  </Text>
                  <Text color="rgba(255,255,255,0.8)" fontSize="$3">
                    Voice or text → MedGemma pipeline
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </TouchableOpacity>
        </YStack>

        {/* LIVE PIPELINE STATUS */}
        {state.currentCaseId && (
          <Card p="$4" bg="white" br="$4" elevate>
            <XStack ai="center" space="$3" mb="$2">
              <Activity size={20} color="#3B82F6" />
              <Text fontSize="$5" fontWeight="700">
                Active Pipeline
              </Text>
              <Badge size="$2" bg="#10B981" color="white">
                Live
              </Badge>
            </XStack>
            <Text fontSize="$4" color="#64748B">
              Case #{state.currentCaseId.slice(-6)}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/medgemma/${state.currentCaseId}`)}
              style={{ marginTop: 8 }}
            >
              <Text color="#3B82F6" fontWeight="600" fontSize="$4">
                View streaming →
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* AUTH LINKS */}
        <XStack space="$3" jc="center" flexWrap="wrap">
          <TouchableOpacity onPress={() => router.push('/(auth)/clinician-login')}>
            <Text color="#64748B" fontSize="$4">
              Clinician Login
            </Text>
          </TouchableOpacity>
          <Text color="#CBD5E1">|</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/parent-onboard')}>
            <Text color="#64748B" fontSize="$4">
              Parent Onboard
            </Text>
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
