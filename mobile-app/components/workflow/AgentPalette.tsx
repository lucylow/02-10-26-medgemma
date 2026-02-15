/**
 * AgentPalette — Tap-to-add agent library for workflow builder
 */

import React from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import type { AgentType } from '@/types/workflow';
import { AGENT_PALETTE, getAgentDescription } from './workflowConfig';

interface AgentPaletteProps {
  agents: typeof AGENT_PALETTE;
  onSelectAgent: (type: AgentType) => void;
}

export function AgentPalette({ agents, onSelectAgent }: AgentPaletteProps) {
  return (
    <YStack
      w={200}
      minW={200}
      bg="white"
      p="$4"
      br="$4"
      borderWidth={2}
      borderColor="#E2E8F0"
      borderStyle="solid"
    >
      <Text fontSize="$6" fontWeight="800" mb="$4" color="#1E3A8A">
        Agent Library
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack space="$3">
          {agents.map(({ type, label, icon: Icon, color }) => (
            <AgentCard
              key={type}
              type={type}
              label={label}
              Icon={Icon}
              color={color}
              onSelect={onSelectAgent}
            />
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

interface AgentCardProps {
  type: AgentType;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  onSelect: (type: AgentType) => void;
}

function AgentCard({ type, label, Icon, color, onSelect }: AgentCardProps) {
  const handlePress = () => {
    onSelect(type);
  };

  return (
    <Pressable onPress={handlePress}>
      <Card
        p="$4"
        br="$3"
        bg={`${color}15`}
        pressStyle={{ scale: 0.98 }}
        borderWidth={1}
        borderColor={`${color}40`}
      >
        <XStack ai="center" space="$3">
          <YStack
            w={40}
            h={40}
            br="$full"
            bg={`${color}30`}
            jc="center"
            ai="center"
          >
            <Icon size={20} color={color} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600" color="#1E293B">
              {label}
            </Text>
            <Text fontSize="$2" color="#64748B">
              {getAgentDescription(type)}
            </Text>
          </YStack>
        </XStack>
      </Card>
    </Pressable>
  );
}
