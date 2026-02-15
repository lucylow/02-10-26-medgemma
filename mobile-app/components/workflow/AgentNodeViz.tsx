/**
 * Individual agent node visualization — Progress ring, icon, status
 */

import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { YStack, XStack, Text, Badge } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import {
  Brain,
  Shield,
  Zap,
  Clock,
  Mic,
  Database,
  AlertCircle,
} from 'lucide-react-native';
import type { AgentNode, AgentNodeType } from '@/types/agentWorkflow';

const AGENT_CONFIG: Record<
  AgentNodeType,
  { color: string; icon: React.ComponentType<{ size?: number; color?: string }>; label: string }
> = {
  voice: { color: '#10B981', icon: Mic, label: 'Voice Input' },
  intake: { color: '#3B82F6', icon: Shield, label: 'Intake' },
  embedding: { color: '#F59E0B', icon: Zap, label: 'Embedding' },
  medgemma: { color: '#8B5CF6', icon: Brain, label: 'MedGemma 4B' },
  temporal: { color: '#06B6D4', icon: Clock, label: 'Temporal' },
  safety: { color: '#EF4444', icon: AlertCircle, label: 'Safety' },
  fhir: { color: '#6B7280', icon: Database, label: 'FHIR Export' },
  summarizer: { color: '#06B6D4', icon: Brain, label: 'Summarizer' },
};

const STATUS_RING_COLORS: Record<string, string> = {
  idle: '#E5E7EB',
  running: '#3B82F6',
  streaming: '#8B5CF6',
  success: '#10B981',
  error: '#EF4444',
};

interface AgentNodeVizProps {
  node: AgentNode;
  index: number;
  total: number;
  onPress?: () => void;
}

const NODE_SIZE = 96;
const CENTER = NODE_SIZE / 2;
const RADIUS = 40;

function ProgressRing({
  progress,
  color,
  status,
}: {
  progress: number;
  color: string;
  status: string;
}) {
  const circumference = 2 * Math.PI * RADIUS;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg
      width={NODE_SIZE}
      height={NODE_SIZE}
      style={StyleSheet.absoluteFill}
    >
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        stroke={STATUS_RING_COLORS[status] ?? '#E5E7EB'}
        strokeWidth={4}
        fill="none"
        opacity={0.3}
      />
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
        opacity={0.9}
      />
    </Svg>
  );
}

export function AgentNodeViz({ node, index, total, onPress }: AgentNodeVizProps) {
  const config = AGENT_CONFIG[node.type];
  const isRunning = node.status === 'running' || node.status === 'streaming';
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRunning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else if (node.status === 'success') {
      pulse.value = withTiming(1.02, { duration: 300 });
    }
  }, [node.status, isRunning]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const Icon = config.icon;
  const progress = node.progress ?? (isRunning ? 0.7 : node.status === 'success' ? 1 : 0);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
          width: NODE_SIZE,
          height: NODE_SIZE,
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={onPress} style={styles.pressable}>
        <View style={[styles.node, isRunning && styles.nodeRunning]}>
          <ProgressRing
            progress={progress}
            color={config.color}
            status={node.status}
          />
          <View style={styles.content}>
            <Icon size={28} color={config.color} />
          </View>
          <Text
            fontSize="$1"
            fontWeight="700"
            color="#475569"
            position="absolute"
            bottom={8}
            left={0}
            right={0}
            textAlign="center"
          >
            {config.label}
          </Text>
          <View style={styles.stepBadge}>
            <Badge size="$1" bg="#F1F5F9" color="#475569" fontWeight="700">
              {index + 1}/{total}
            </Badge>
          </View>
          {node.confidence !== undefined && node.confidence > 0 && (
            <View style={styles.confidenceBadge}>
              <Text fontSize="$1" fontWeight="700" color="white">
                {Math.round(node.confidence * 100)}%
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: NODE_SIZE,
    height: NODE_SIZE,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  nodeRunning: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 4,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
  },
  confidenceBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
});
