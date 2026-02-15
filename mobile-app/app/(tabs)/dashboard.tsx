import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { YStack, XStack, Text, Card, Badge, Input, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Brain, Activity, Zap, BarChart3, Shield, Clock } from 'lucide-react-native';
import { useAI } from '@/contexts/AIAgentProvider';
import { useFhirPatientTimeline } from '@/hooks/useFhirQueries';
import {
  FhirRiskTimeline,
  FhirMilestoneRadar,
  AgentPerformanceChart,
  FhirSummaryMetrics,
} from '@/components/charts/FhirCharts';
import { InfiniteHistoryList } from '@/components/InfiniteHistoryList';
import { ChartSkeleton } from '@/components/ChartSkeleton';
import { StatCard } from '@/components/StatCard';
import { VoiceInput } from '@/components/VoiceInput';
import { RecentCases } from '@/components/RecentCases';
import { AgentStatusBadge } from '@/components/AgentStatusBadge';

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

const STATS = {
  casesToday: 23,
  aiAccuracy: 94.2,
  hitlRate: 12.3,
  avgTime: '2.8s',
};

export default function MedGemmaDashboard() {
  const router = useRouter();
  const { user, userRole, userMode, hasAccess, organization, signOut } =
    useAuthState();
  const { startPipeline, state } = useAI();
  const { width } = useWindowDimensions();
  const [quickInput, setQuickInput] = useState('');
  const [quickAge, setQuickAge] = useState(24);

  const clinicianFeatures = hasAccess('view_evidence');

  const patientId = 'patient-123';
  const clinicId: string | undefined = undefined;
  const {
    riskTimeline,
    milestoneTrends,
    patientHistory,
    summary,
    isLoading: chartsLoading,
    refetch,
  } = useFhirPatientTimeline(patientId, clinicId);

  const handleQuickStart = () => {
    router.push('/(tabs)/cases');
  };

  const handleQuickScreen = async () => {
    await startPipeline({
      age: quickAge,
      observations: quickInput || '24 month old says 10 words, poor eye contact',
    });
  };

  const handleVoiceTranscript = async (text: string) => {
    await startPipeline({
      age: quickAge,
      observations: text,
      voiceTranscript: text,
    });
  };

  const handleQuickScreen = async () => {
    await startPipeline({
      age: quickAge,
      observations: quickInput || '24 month old says 10 words, poor eye contact',
    });
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <YStack space="$6" p="$4">
        {/* USER HEADER */}
        <UserHeader
          user={user}
          role={userRole}
          organization={organization}
          onSettings={() => router.push('/(tabs)/settings')}
          onSignOut={() => signOut?.() ?? router.push('/(auth)/sign-in')}
        />

        {/* HERO */}
        <YStack ai="center" space="$4">
          <XStack ai="center" space="$3">
            <Text fontSize="$10" fontWeight="900" color="#1E3A8A">
              PediScreen AI
            </Text>
            <Badge size="$3" bg="#10B981" color="white">
              MedGemma 4B
            </Badge>
          </XStack>
          <Text fontSize="$5" color="#64748B">
            Pediatric screening • ASQ-3 validated • Live HITL
          </Text>
        </YStack>

        {/* STATS GRID */}
        <XStack flexWrap="wrap" gap="$3">
          <StatCard icon={Activity} value={STATS.casesToday} label="Today" />
          <StatCard icon={Brain} value={`${STATS.aiAccuracy}%`} label="Accuracy" color="#10B981" />
          <StatCard icon={Shield} value={`${STATS.hitlRate}%`} label="HITL" color="#F59E0B" />
          <StatCard icon={Clock} value={STATS.avgTime} label="Avg Time" color="#3B82F6" />
        </XStack>

        {/* QUICK SCREENING */}
        <Card bg="#F8FAFC" p="$6" br="$4" borderWidth={1} borderColor="#E2E8F0">
          <Text fontSize="$6" fontWeight="700" mb="$5">
            Quick Screening
          </Text>
          <YStack space="$4">
            <Input
              placeholder="Describe observations..."
              value={quickInput}
              onChangeText={setQuickInput}
              bg="white"
              borderColor="#E2E8F0"
            />
            <XStack space="$3" flexWrap="wrap">
              <Input
                placeholder="Age (months)"
                value={quickAge.toString()}
                onChangeText={(t) => setQuickAge(Number(t) || 24)}
                w={120}
                bg="white"
                borderColor="#E2E8F0"
              />
              <Button flex={1} minWidth={120} bg="#1E3A8A" color="white" onPress={handleQuickScreen}>
                Run Pipeline
              </Button>
            </XStack>
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </YStack>
        </Card>

        {/* QUICK STATS CARDS */}
        <XStack flexWrap="wrap" gap="$3">
          {clinicianCards(state.caseId).map((card) => (
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
          <TouchableOpacity onPress={() => handleQuickScreen()}>
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
        {state.caseId && (
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
            {state.agents && state.agents.length > 0 && (
              <XStack ai="center" gap="$2" mt="$2" flexWrap="wrap">
                {state.agents.slice(0, 4).map((a) => (
                  <AgentStatusBadge
                    key={a.id}
                    agent={a.id}
                    status={a.status as 'idle' | 'running' | 'streaming' | 'success' | 'error'}
                    confidence={a.confidence}
                    size="small"
                    showIcon={false}
                  />
                ))}
              </XStack>
            )}
            <Text fontSize="$4" color="#64748B">
              Case #{state.caseId.slice(-6)}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/medgemma/${state.caseId}`)}
              style={{ marginTop: 8 }}
            >
              <Text color="#3B82F6" fontWeight="600" fontSize="$4">
                View streaming →
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* FHIR VISUALIZATION DASHBOARD */}
        <YStack space="$6" mt="$4">
          <XStack ai="center" space="$3">
            <BarChart3 size={24} color="#1E3A8A" />
            <Text fontSize="$7" fontWeight="800" color="#1E3A8A">
              FHIR Data Visualization
            </Text>
            <Badge size="$2" bg="#10B981" color="white">
              R4 STU3
            </Badge>
          </XStack>

          {chartsLoading ? (
            <ChartSkeleton />
          ) : (
            <>
              <FhirSummaryMetrics summary={summary} />
              <FhirRiskTimeline patientId={patientId} timeRangeLabel="Live" />
              <YStack space="$4">
                <FhirMilestoneRadar patientId={patientId} />
                <AgentPerformanceChart clinicId="clinic-123" />
              </YStack>
              <InfiniteHistoryList
                pages={patientHistory.data?.pages}
                hasNextPage={patientHistory.hasNextPage}
                fetchNextPage={patientHistory.fetchNextPage}
                isFetchingNextPage={patientHistory.isFetchingNextPage}
              />
            </>
          )}
        </YStack>

        {/* RECENT CASES */}
        <RecentCases />

        {/* AUTH LINKS */}
        <XStack space="$3" jc="center" flexWrap="wrap" mt="$6">
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
