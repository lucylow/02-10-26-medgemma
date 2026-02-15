/**
 * Workflow legend — Status counts with color indicators
 */

import React from 'react';
import { View } from 'react-native';
import { XStack, Text, Badge } from 'tamagui';
import type { AgentNode, AgentNodeStatus } from '@/types/agentWorkflow';

const STATUS_COLORS: Record<AgentNodeStatus, string> = {
  idle: '#E5E7EB',
  running: '#3B82F6',
  streaming: '#8B5CF6',
  success: '#10B981',
  error: '#EF4444',
};

interface WorkflowLegendProps {
  pipeline: AgentNode[];
}

export function WorkflowLegend({ pipeline }: WorkflowLegendProps) {
  const statusCounts = pipeline.reduce(
    (acc, node) => {
      acc[node.status] = (acc[node.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <XStack gap="$4" ai="center" flexWrap="wrap">
      <Text fontSize="$3" color="#64748B" fontWeight="600">
        Status:
      </Text>
      {Object.entries(statusCounts).map(([status, count]) => (
        <XStack key={status} ai="center" gap="$2">
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: STATUS_COLORS[status as AgentNodeStatus] ?? '#94A3B8',
            }}
          />
          <Text fontSize="$3" color="#64748B">
            {status.toUpperCase()}
          </Text>
          <Badge size="$1" bg="#F1F5F9" color="#475569">
            {count}
          </Badge>
        </XStack>
      ))}
    </XStack>
  );
}
