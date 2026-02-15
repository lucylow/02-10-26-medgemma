/**
 * Agent Status Badge — Confidence, risk, live status
 */

import React, { useEffect } from 'react';
import { Badge, XStack, Text, YStack } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Brain,
  Shield,
  Zap,
  Clock,
  AlertCircle,
  Mic,
  Database,
  CheckCircle,
} from 'lucide-react-native';
import { RiskBadge, type RiskLevel } from './RiskBadge';

const AGENT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number; color?: string }>; color: string }
> = {
  medgemma: { icon: Brain, color: '#3B82F6' },
  safety: { icon: Shield, color: '#10B981' },
  embedding: { icon: Zap, color: '#F59E0B' },
  temporal: { icon: Clock, color: '#8B5CF6' },
  voice: { icon: Mic, color: '#EC4899' },
  fhir: { icon: Database, color: '#6B7280' },
  intake: { icon: Shield, color: '#3B82F6' },
};

export type AgentStatus =
  | 'idle'
  | 'running'
  | 'streaming'
  | 'success'
  | 'error'
  | 'offline'
  | 'pending'
  | 'failed';

interface AgentStatusBadgeProps {
  agent: string;
  status: AgentStatus;
  confidence?: number;
  risk?: RiskLevel;
  progress?: number;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const STATUS_THEMES: Record<
  AgentStatus,
  { bg: string; border: string; color: string }
> = {
  success: { bg: '#D1FAE5', border: '#059669', color: '#065F46' },
  running: { bg: '#DBEAFE', border: '#2563EB', color: '#1E40AF' },
  streaming: { bg: '#EDE9FE', border: '#7C3AED', color: '#5B21B6' },
  error: { bg: '#FEE2E2', border: '#DC2626', color: '#991B1B' },
  failed: { bg: '#FEE2E2', border: '#DC2626', color: '#991B1B' },
  offline: { bg: '#F1F5F9', border: '#64748B', color: '#475569' },
  idle: { bg: '#F1F5F9', border: '#94A3B8', color: '#64748B' },
  pending: { bg: '#F1F5F9', border: '#94A3B8', color: '#64748B' },
};

export function AgentStatusBadge({
  agent,
  status,
  confidence = 1,
  risk,
  size = 'medium',
  showIcon = true,
}: AgentStatusBadgeProps) {
  const pulse = useSharedValue(1);
  const config = AGENT_CONFIG[agent] ?? AGENT_CONFIG.medgemma;
  const Icon = config.icon;
  const theme = STATUS_THEMES[status] ?? STATUS_THEMES.idle;

  useEffect(() => {
    if (status === 'running' || status === 'streaming') {
      pulse.value = withSpring(1.05, { damping: 12 });
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const sizeMap = {
    small: { size: '$2' as const, iconSize: 12 },
    medium: { size: '$3' as const, iconSize: 16 },
    large: { size: '$4' as const, iconSize: 20 },
  };
  const { size: badgeSize, iconSize } = sizeMap[size];

  return (
    <Animated.View style={animatedStyle}>
      <Badge
        size={badgeSize}
        bg={theme.bg}
        borderWidth={2}
        borderColor={theme.border}
        fontWeight="700"
      >
        <XStack ai="center" gap="$1">
          {showIcon && <Icon size={iconSize} color={theme.border} />}
          <Text color={theme.color} fontWeight="700" fontSize="$2">
            {agent.toUpperCase().slice(0, 3)}
          </Text>
          {confidence < 1 && status !== 'error' && status !== 'failed' && (
            <Text color={theme.color} fontSize="$1" opacity={0.9}>
              {Math.round(confidence * 100)}%
            </Text>
          )}
        </XStack>
      </Badge>
      {risk && (
        <YStack mt="$1">
          <RiskBadge risk={risk} size="$1" />
        </YStack>
      )}
    </Animated.View>
  );
}
