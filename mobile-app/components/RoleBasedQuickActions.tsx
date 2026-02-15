import React from 'react';
import { Card, Text, Input, Button, XStack, YStack } from 'tamagui';
import { Brain, Shield, Mic, Clock, Users } from 'lucide-react-native';
import type { UserMode } from '@/contexts/AuthProvider';

interface RoleBasedQuickActionsProps {
  userMode: UserMode;
  hasClinicianAccess: boolean;
  onQuickScreen: () => void;
  quickInput: string;
  setQuickInput: (text: string) => void;
}

const clinicianActions = [
  { label: 'Full Pipeline', icon: Brain, color: '#1E3A8A' },
  { label: 'Safety Check', icon: Shield, color: '#EF4444' },
  { label: 'History Analysis', icon: Clock, color: '#8B5CF6' },
];

const parentActions = [
  { label: 'Quick Screen', icon: Mic, color: '#10B981' },
  { label: 'My Child', icon: Users, color: '#3B82F6' },
];

export function RoleBasedQuickActions({
  userMode,
  hasClinicianAccess,
  onQuickScreen,
  quickInput,
  setQuickInput,
}: RoleBasedQuickActionsProps) {
  const actions = hasClinicianAccess ? clinicianActions : parentActions;

  return (
    <Card bg="#F8FAFC" p="$6" br="$4" borderWidth={1} borderColor="#E2E8F0">
      <Text fontSize="$6" fontWeight="700" mb="$5">
        {userMode === 'clinician' ? 'Quick Actions' : 'Easy Screening'}
      </Text>

      <YStack space="$3">
        <Input
          placeholder="Describe observations (e.g. '24mo says 10 words, ignores name')"
          value={quickInput}
          onChangeText={setQuickInput}
          size="$4"
          bg="white"
          borderColor="#E2E8F0"
        />

        <XStack space="$3" flexWrap="wrap">
          {actions.map(({ label, icon: Icon, color }) => (
            <Button
              key={label}
              flex={1}
              minWidth={100}
              size="$5"
              bg={color}
              color="white"
              icon={<Icon size={20} color="white" />}
              onPress={onQuickScreen}
            >
              {label}
            </Button>
          ))}
        </XStack>
      </YStack>
    </Card>
  );
}
