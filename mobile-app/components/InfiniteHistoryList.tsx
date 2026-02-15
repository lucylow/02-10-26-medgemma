/**
 * Infinite scroll list for FHIR patient history
 * Renders inside ScrollView - uses Load more for pagination.
 */
import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import type { FHIRObservation } from '@/hooks/useFhirQueries';

interface InfiniteHistoryListProps {
  pages?: Array<{ entries: FHIRObservation[] }>;
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage?: boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getObservationLabel(obs: FHIRObservation): string {
  const code = obs.code?.coding?.[0]?.display ?? obs.code?.text ?? 'Observation';
  const value = obs.valueQuantity?.value ?? obs.component?.[0]?.valueQuantity?.value;
  if (value != null) return `${code}: ${value}`;
  return code;
}

export function InfiniteHistoryList({
  pages = [],
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: InfiniteHistoryListProps) {
  const entries = pages.flatMap((p) => p.entries);

  if (entries.length === 0) {
    return (
      <Card bg="white" p="$6" br="$4" elevate>
        <YStack h={120} jc="center" ai="center">
          <Text fontSize="$4" color="#64748B">
            No history yet
          </Text>
        </YStack>
      </Card>
    );
  }

  return (
    <YStack space="$3">
      <Text fontSize="$6" fontWeight="700" color="#1E3A8A">
        Patient History
      </Text>
      {entries.map((item) => (
        <Card key={item.id} bg="white" p="$4" br="$3" elevate>
          <XStack jc="space-between" ai="flex-start" flexWrap="wrap">
            <YStack flex={1} minWidth={0}>
              <Text fontSize="$4" fontWeight="600" color="#1E3A8A" numberOfLines={2}>
                {getObservationLabel(item)}
              </Text>
              <Text fontSize="$3" color="#64748B" mt="$1">
                {formatDate(item.effectiveDateTime)}
              </Text>
            </YStack>
            <Text fontSize="$3" color="#10B981">
              {item.status}
            </Text>
          </XStack>
        </Card>
      ))}
      {hasNextPage && (
        <TouchableOpacity
          onPress={() => !isFetchingNextPage && fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          <YStack py="$4" ai="center">
            {isFetchingNextPage ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text fontSize="$4" color="#3B82F6" fontWeight="600">
                Load more
              </Text>
            )}
          </YStack>
        </TouchableOpacity>
      )}
    </YStack>
  );
}
