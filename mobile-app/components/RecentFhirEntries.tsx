import React from 'react';
import { XStack, YStack, Text, Card } from 'tamagui';
import { FileText } from 'lucide-react-native';
import type { RiskTimelinePoint } from '@/hooks/useFhirCharts';

interface RecentFhirEntriesProps {
  observations: RiskTimelinePoint[];
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low':
      return '#10B981';
    case 'monitor':
      return '#F59E0B';
    case 'elevated':
    case 'discuss':
      return '#EF4444';
    default:
      return '#64748B';
  }
}

export function RecentFhirEntries({ observations }: RecentFhirEntriesProps) {
  if (observations.length === 0) return null;

  return (
    <Card bg="white" p="$6" br="$4" elevate>
      <XStack ai="center" space="$2" mb="$4">
        <FileText size={20} color="#1E3A8A" />
        <Text fontSize="$6" fontWeight="700" color="#1E3A8A">
          Recent FHIR Entries
        </Text>
      </XStack>

      <YStack space="$3">
        {observations.slice(0, 5).map((obs, i) => (
          <XStack key={i} ai="center" jc="space-between" py="$2">
            <YStack flex={1}>
              <Text fontSize="$4" color="#1E293B">
                {obs.date}
              </Text>
              <Text fontSize="$3" color="#64748B">
                {obs.domain} • {(obs.confidence * 100).toFixed(0)}% conf
              </Text>
            </YStack>
            <XStack
              px="$3"
              py="$1"
              br="$2"
              bg={`${getRiskColor(obs.risk)}20`}
            >
              <Text fontSize="$3" fontWeight="600" color={getRiskColor(obs.risk)}>
                {obs.risk}
              </Text>
            </XStack>
          </XStack>
        ))}
      </YStack>
    </Card>
  );
}
