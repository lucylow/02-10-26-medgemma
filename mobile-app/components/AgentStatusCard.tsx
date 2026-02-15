/**
 * Agent Status Card — Full status with progress, confidence, risk
 */

import React from 'react';
import { Card, YStack, XStack, Text, Badge } from 'tamagui';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import {
  Brain,
  Shield,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { MedicalHeading, MedicalBody } from '@/lib/MedicalTypography';
import { RiskBadge, type RiskLevel } from './RiskBadge';

const AGENT_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  medgemma: Brain,
  safety: Shield,
  temporal: Clock,
  fhir: AlertCircle,
  intake: Shield,
  embedding: Brain,
};

export type AgentCardStatus =
  | 'idle'
  | 'running'
  | 'streaming'
  | 'success'
  | 'error'
  | 'pending';

interface AgentStatus {
  name: string;
  status: AgentCardStatus;
  confidence?: number;
  progress?: number;
  risk?: RiskLevel;
}

interface AgentStatusCardProps {
  agent: AgentStatus;
}

function getStatusColors(status: AgentCardStatus) {
  switch (status) {
    case 'success':
      return { bg: '#D1FAE5', border: '#059669' };
    case 'running':
    case 'streaming':
      return { bg: '#DBEAFE', border: '#2563EB' };
    case 'error':
      return { bg: '#FEE2E2', border: '#DC2626' };
    default:
      return { bg: '#F8FAFC', border: '#E2E8F0' };
  }
}

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const scale = useSharedValue(1);
  const colors = getStatusColors(agent.status);
  const Icon = AGENT_ICONS[agent.name] ?? Brain;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const displayName = agent.name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => (scale.value = 0.98)}
        onPressOut={() => (scale.value = 1)}
      >
        <Card
          elevate
          borderWidth={2}
          borderColor={colors.border}
          bg={colors.bg}
          p="$5"
          gap="$4"
          br="$4"
        >
          <XStack ai="center" gap="$3">
            <YStack
              w={48}
              h={48}
              jc="center"
              ai="center"
              bg={`${colors.border}20`}
              br="$4"
            >
              <Icon size={24} color={colors.border} />
            </YStack>
            <YStack flex={1}>
              <MedicalHeading size="h4" color="$gray12">
                {displayName}
              </MedicalHeading>
              <Badge
                size="$2"
                bg={agent.status === 'error' ? '#FEE2E2' : '#D1FAE5'}
                color={agent.status === 'error' ? '#991B1B' : '#065F46'}
              >
                {agent.status.toUpperCase()}
              </Badge>
            </YStack>
          </XStack>

          {agent.progress !== undefined && agent.progress > 0 && (
            <YStack gap="$2">
              <View style={progressStyles.track}>
                <View
                  style={[
                    progressStyles.fill,
                    {
                      width: `${agent.progress * 100}%`,
                      backgroundColor: colors.border,
                    },
                  ]}
                />
              </View>
              <MedicalBody fontSize="$3" color="#64748B">
                {Math.round(agent.progress * 100)}% Complete
              </MedicalBody>
            </YStack>
          )}

          <XStack gap="$3" ai="center" flexWrap="wrap">
            {agent.confidence !== undefined && agent.confidence > 0 && (
              <Badge
                size="$2"
                bg={
                  agent.confidence > 0.9
                    ? '#D1FAE5'
                    : agent.confidence > 0.7
                    ? '#FEF3C7'
                    : '#FEE2E2'
                }
                color={
                  agent.confidence > 0.9
                    ? '#065F46'
                    : agent.confidence > 0.7
                    ? '#92400E'
                    : '#991B1B'
                }
              >
                {Math.round(agent.confidence * 100)}% Confidence
              </Badge>
            )}
            {agent.risk && <RiskBadge risk={agent.risk} size="$2" />}
          </XStack>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
