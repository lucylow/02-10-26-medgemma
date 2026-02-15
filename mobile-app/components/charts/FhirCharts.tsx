/**
 * Dynamic FHIR Chart Components - PediScreen AI
 * Auto-updating risk timeline and milestone radar using existing chart primitives.
 */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { LineChart } from './Charts';
import { useFhirPatientTimeline } from '@/hooks/useFhirQueries';
import { useAgentPerformanceMetrics } from '@/hooks/useFhirResources';
import type { RiskTimelinePoint } from '@/hooks/useFhirQueries';

const riskValues: Record<string, number> = {
  low: 1,
  monitor: 2,
  elevated: 3,
  discuss: 4,
};

// --- Risk Legend ---
function RiskLegend() {
  const items = [
    { label: 'Low', color: '#10B981' },
    { label: 'Monitor', color: '#F59E0B' },
    { label: 'Elevated', color: '#EF4444' },
    { label: 'Discuss', color: '#7C3AED' },
  ];
  return (
    <XStack ai="center" space="$4" mt="$4" flexWrap="wrap">
      {items.map(({ label, color }) => (
        <XStack key={label} ai="center" space="$2">
          <View style={{ width: 12, height: 3, backgroundColor: color, borderRadius: 2 }} />
          <Text fontSize="$3" color="#64748B">
            {label}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

// --- Auto-updating risk timeline chart ---
export interface FhirRiskTimelineProps {
  patientId: string;
  timeRangeLabel?: string;
}

export function FhirRiskTimeline({ patientId, timeRangeLabel = 'Live' }: FhirRiskTimelineProps) {
  const { riskTimeline, isFetching } = useFhirPatientTimeline(patientId);

  const chartData = riskTimeline.map((point: RiskTimelinePoint) => ({
    date: point.date,
    riskScore: riskValues[point.riskLevel] ?? 2,
    confidence: point.confidence * 100,
  }));

  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <XStack ai="center" space="$3" mb="$4">
        <Text fontSize="$7" fontWeight="800" color="#1E3A8A">
          Risk Timeline (Live)
        </Text>
        {isFetching && (
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 8 }} />
        )}
      </XStack>

      <YStack space="$4" minHeight={220}>
        {chartData.length > 0 ? (
          <>
            <LineChart
              data={chartData}
              xKey="date"
              yKey="riskScore"
              color="#EF4444"
              strokeWidth={2}
              showDots
              dotSize={6}
              height={140}
              yDomain={[0.5, 4.5]}
            />
            <LineChart
              data={chartData}
              xKey="date"
              yKey="confidence"
              color="#3B82F6"
              strokeWidth={1.5}
              showDots={false}
              height={80}
              yDomain={[0, 100]}
            />
          </>
        ) : (
          <YStack h={180} jc="center" ai="center">
            <Text fontSize="$4" color="#64748B">
              No risk data yet
            </Text>
          </YStack>
        )}

        <XStack jc="space-between" px="$2">
          <Text fontSize="$3" color="#64748B">
            Past
          </Text>
          <Text fontSize="$3" color="#64748B">
            Today
          </Text>
        </XStack>
      </YStack>

      <RiskLegend />
    </Card>
  );
}

// --- Milestone radar-style card (bar representation for React Native) ---
export interface FhirMilestoneRadarProps {
  patientId: string;
}

const DOMAINS = [
  { key: 'language', label: 'Language', color: '#10B981' },
  { key: 'motor', label: 'Motor', color: '#F59E0B' },
  { key: 'social', label: 'Social', color: '#8B5CF6' },
  { key: 'cognitive', label: 'Cognitive', color: '#3B82F6' },
];

export function FhirMilestoneRadar({ patientId }: FhirMilestoneRadarProps) {
  const { milestoneTrends, summary } = useFhirPatientTimeline(patientId);

  const scores = DOMAINS.map((d, i) => {
    const trend = milestoneTrends[i]?.data;
    if (Array.isArray(trend) && trend.length > 0) return trend[trend.length - 1].score;
    return 0;
  });

  return (
    <Card
      bg="white"
      p="$6"
      br="$4"
      elevate
      style={{ backgroundColor: '#F0F9FF' }}
    >
      <Text fontSize="$7" fontWeight="700" mb="$5" color="#1E3A8A">
        ASQ-3 Milestones • {summary.percentile}th percentile
      </Text>

      <YStack space="$4">
        {DOMAINS.map(({ key, label, color }, i) => {
          const value = scores[i] ?? 0;
          return (
            <XStack key={key} ai="center" space="$4">
              <Text fontSize="$4" fontWeight="600" flex={1} minWidth={80}>
                {label}
              </Text>
              <View
                style={{
                  flex: 2,
                  height: 12,
                  backgroundColor: '#E0F2FE',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, Math.max(0, value))}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 6,
                  }}
                />
              </View>
              <Text fontSize="$4" fontWeight="600" color={color}>
                {value.toFixed(0)}
              </Text>
            </XStack>
          );
        })}
      </YStack>
    </Card>
  );
}

// --- Agent performance chart ---
export interface AgentPerformanceChartProps {
  clinicId: string;
}

export function AgentPerformanceChart({ clinicId }: AgentPerformanceChartProps) {
  const { data, isLoading } = useAgentPerformanceMetrics(clinicId);

  if (isLoading || !data) {
    return (
      <Card bg="white" p="$6" br="$4" elevate>
        <YStack h={120} jc="center" ai="center">
          <ActivityIndicator size="small" color="#3B82F6" />
        </YStack>
      </Card>
    );
  }

  const { medgemma } = data;

  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <Text fontSize="$7" fontWeight="800" mb="$4" color="#1E3A8A">
        MedGemma Performance
      </Text>
      <YStack space="$3">
        <XStack jc="space-between" ai="center">
          <Text fontSize="$4" color="#64748B">
            Accuracy
          </Text>
          <Text fontSize="$5" fontWeight="700" color="#10B981">
            {(medgemma.accuracy * 100).toFixed(1)}%
          </Text>
        </XStack>
        <XStack jc="space-between" ai="center">
          <Text fontSize="$4" color="#64748B">
            HITL Rate
          </Text>
          <Text fontSize="$5" fontWeight="700" color="#F59E0B">
            {(medgemma.hitlRate * 100).toFixed(1)}%
          </Text>
        </XStack>
        <XStack jc="space-between" ai="center">
          <Text fontSize="$4" color="#64748B">
            Avg Confidence
          </Text>
          <Text fontSize="$5" fontWeight="700" color="#3B82F6">
            {(medgemma.avgConfidence * 100).toFixed(1)}%
          </Text>
        </XStack>
      </YStack>
    </Card>
  );
}

// --- FHIR Summary metrics ---
export interface FhirSummaryMetricsProps {
  summary: {
    totalObservations: number;
    riskCounts: { low: number; monitor: number; elevated: number; discuss: number };
    percentile: number;
    trend: 'stable' | 'increasing' | 'decreasing';
  };
}

export function FhirSummaryMetrics({ summary }: FhirSummaryMetricsProps) {
  const trendColor = summary.trend === 'increasing' ? '#EF4444' : summary.trend === 'decreasing' ? '#10B981' : '#64748B';
  return (
    <XStack flexWrap="wrap" gap="$3">
      <Card flex={1} minWidth={80} p="$4" bg="white" br="$4" elevate>
        <Text fontSize="$3" color="#64748B">
          Observations
        </Text>
        <Text fontSize="$6" fontWeight="800" color="#1E3A8A">
          {summary.totalObservations}
        </Text>
      </Card>
      <Card flex={1} minWidth={80} p="$4" bg="white" br="$4" elevate>
        <Text fontSize="$3" color="#64748B">
          Percentile
        </Text>
        <Text fontSize="$6" fontWeight="800" color="#3B82F6">
          {summary.percentile}th
        </Text>
      </Card>
      <Card flex={1} minWidth={80} p="$4" bg="white" br="$4" elevate>
        <Text fontSize="$3" color="#64748B">
          Trend
        </Text>
        <Text fontSize="$6" fontWeight="800" color={trendColor}>
          {summary.trend}
        </Text>
      </Card>
      <Card flex={1} minWidth={80} p="$4" bg="white" br="$4" elevate>
        <Text fontSize="$3" color="#64748B">
          Low / Monitor / ↑
        </Text>
        <Text fontSize="$5" fontWeight="700" color="#1E3A8A">
          {summary.riskCounts.low} / {summary.riskCounts.monitor} / {summary.riskCounts.elevated + summary.riskCounts.discuss}
        </Text>
      </Card>
    </XStack>
  );
}
