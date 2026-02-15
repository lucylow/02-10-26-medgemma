/**
 * Stat card for dashboard metrics.
 */

import React from 'react';
import { Card, YStack, XStack, Text } from 'tamagui';
import type { LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: string;
}

export function StatCard({ icon: Icon, value, label, color = '#1E3A8A' }: StatCardProps) {
  return (
    <Card flex={1} minWidth={80} p="$4" bg="white" br="$4" elevate>
      <YStack space="$1">
        <Icon size={20} color={color} />
        <Text fontSize="$7" fontWeight="800" color={color}>
          {value}
        </Text>
        <Text fontSize="$3" color="#64748B">
          {label}
        </Text>
      </YStack>
    </Card>
  );
}
