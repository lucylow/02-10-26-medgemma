/**
 * Explainability Panel — AI decision reasoning, evidence, sources
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Card, Text, Badge, Button } from 'tamagui';
import { Brain, ShieldCheck, Scale } from 'lucide-react-native';
import { MedicalHeading, MedicalBody, MedicalLabel } from '@/lib/MedicalTypography';

interface AgentOutput {
  evidence?: string[];
  sources?: string[];
  rationale?: string;
}

interface ExplainabilityPanelProps {
  agentOutput: AgentOutput;
  show?: boolean;
}

export function ExplainabilityPanel({
  agentOutput,
  show = false,
}: ExplainabilityPanelProps) {
  if (!show) return null;

  return (
    <Card
      elevate
      borderWidth={2}
      borderColor="#3B82F6"
      p="$5"
      gap="$4"
      mt="$6"
      br="$4"
    >
      <XStack ai="center" gap="$3">
        <Brain size={24} color="#3B82F6" />
        <MedicalHeading size="h3">AI Decision Reasoning</MedicalHeading>
      </XStack>

      {agentOutput.evidence && agentOutput.evidence.length > 0 && (
        <YStack gap="$2">
          <MedicalLabel>Clinical Evidence</MedicalLabel>
          <ScrollView style={{ maxHeight: 200 }}>
            <YStack gap="$1">
              {agentOutput.evidence.map((evidence, i) => (
                <Text key={i} fontSize="$4" color="#475569">
                  • {evidence}
                </Text>
              ))}
            </YStack>
          </ScrollView>
        </YStack>
      )}

      {agentOutput.sources && agentOutput.sources.length > 0 && (
        <YStack gap="$2">
          <MedicalLabel>Medical Guidelines</MedicalLabel>
          <XStack gap="$2" flexWrap="wrap">
            {agentOutput.sources.map((source) => (
              <Badge key={source} size="$2" bg="#DBEAFE" color="#1E40AF">
                {source}
              </Badge>
            ))}
          </XStack>
        </YStack>
      )}

      <XStack gap="$3" mt="$4">
        <Button variant="outlined" flex={1} borderColor="#64748B" color="#64748B">
          <Scale size={20} />
          Override Assessment
        </Button>
        <Button flex={1} bg="#1E3A8A" color="white">
          <ShieldCheck size={20} />
          Approve & Save
        </Button>
      </XStack>
    </Card>
  );
}
