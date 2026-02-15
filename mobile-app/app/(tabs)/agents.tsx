/**
 * PediScreen AI Agents Dashboard — Real-time multi-agent status
 */

import React, { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { YStack, XStack, Button } from 'tamagui';
import { Brain, Mic, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AgentStatusCard } from '@/components/AgentStatusCard';
import { MedicalHeading, MedicalBody } from '@/lib/MedicalTypography';
import Animated, { FadeIn } from 'react-native-reanimated';

const MOCK_AGENTS = [
  {
    name: 'medgemma',
    status: 'streaming' as const,
    confidence: 0.87,
    progress: 0.65,
    risk: 'monitor' as const,
  },
  {
    name: 'safety',
    status: 'idle' as const,
    confidence: 1.0,
  },
  {
    name: 'temporal',
    status: 'success' as const,
    confidence: 0.95,
    risk: 'low' as const,
  },
  {
    name: 'fhir',
    status: 'idle' as const,
  },
];

export default function AgentDashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <YStack flex={1} bg="$background" p="$5">
      <YStack ai="center" gap="$4" mb="$8">
        <Brain size={64} color="#3B82F6" />
        <MedicalHeading size="h1" ta="center">
          PediScreen AI Agents
        </MedicalHeading>
        <MedicalBody ta="center" color="$gray11">
          Real-time multi-agent pediatric screening powered by MedGemma 4B-IT
        </MedicalBody>
      </YStack>

      <XStack gap="$4" mb="$8">
        <Button
          flex={1}
          size="$5"
          icon={<Mic size={24} color="white" />}
          bg="#1E3A8A"
          color="white"
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          Voice Input
        </Button>
        <Button
          flex={1}
          size="$5"
          icon={<Zap size={24} color="white" />}
          bg="#1E3A8A"
          color="white"
          onPress={() => router.push('/(tabs)/dashboard')}
        >
          Quick Screen
        </Button>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <XStack gap="$6" flexWrap="wrap" jc="flex-start">
          {agents.map((agent, index) => (
            <Animated.View
              entering={FadeIn.delay(index * 100)}
              key={agent.name}
              style={{ flexBasis: index < 2 ? '48%' : '100%', minWidth: 160 }}
            >
              <AgentStatusCard agent={agent} />
            </Animated.View>
          ))}
        </XStack>
      </ScrollView>
    </YStack>
  );
}
