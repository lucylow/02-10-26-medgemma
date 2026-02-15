/**
 * WorkflowHeader — Export, run, validation status
 */

import React from 'react';
import { Platform, Alert } from 'react-native';
import { YStack, XStack, Text, Button, Badge } from 'tamagui';
import { Download, Play, AlertCircle } from 'lucide-react-native';

interface WorkflowHeaderProps {
  nodeCount: number;
  connectionCount: number;
  isValid: boolean;
  issues: string[];
  onExport: () => string;
  onRun: () => void;
}

export function WorkflowHeader({
  nodeCount,
  connectionCount,
  isValid,
  issues,
  onExport,
  onRun,
}: WorkflowHeaderProps) {
  const handleExport = () => {
    const json = onExport();
    if (Platform.OS === 'web' && typeof navigator?.clipboard?.writeText === 'function') {
      navigator.clipboard.writeText(json).then(
        () => Alert.alert('Exported', 'Workflow JSON copied to clipboard'),
        () => Alert.alert('Export', `Workflow JSON:\n\n${json.slice(0, 300)}...`)
      );
    } else {
      Alert.alert('Workflow JSON', json.slice(0, 500) + (json.length > 500 ? '...' : ''));
    }
  };

  return (
    <YStack
      bg="white"
      p="$4"
      borderBottomWidth={1}
      borderColor="#E2E8F0"
    >
      <XStack ai="center" jc="space-between" flexWrap="wrap" gap="$3">
        <XStack ai="center" space="$4">
          <Text fontSize="$6" fontWeight="800" color="#1E3A8A">
            Workflow Builder
          </Text>
          <Badge size="$2" bg={isValid ? '#10B981' : '#EF4444'} color="white">
            {isValid ? 'Valid' : 'Invalid'}
          </Badge>
          <Text fontSize="$3" color="#64748B">
            {nodeCount} nodes · {connectionCount} connections
          </Text>
        </XStack>

        <XStack space="$2">
          <Button
            size="$3"
            bg="#64748B"
            color="white"
            icon={<Download size={16} />}
            onPress={handleExport}
          >
            Export JSON
          </Button>
          <Button
            size="$3"
            bg="#1E3A8A"
            color="white"
            icon={<Play size={16} />}
            onPress={onRun}
            disabled={!isValid}
          >
            Run
          </Button>
        </XStack>
      </XStack>

      {!isValid && issues.length > 0 && (
        <XStack ai="center" space="$2" mt="$3" bg="#FEF2F2" p="$3" br="$3">
          <AlertCircle size={18} color="#EF4444" />
          <Text fontSize="$3" color="#EF4444">
            {issues.join(' · ')}
          </Text>
        </XStack>
      )}
    </YStack>
  );
}
