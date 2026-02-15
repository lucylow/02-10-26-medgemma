import React from 'react';
import { XStack, YStack, Text, Button, Avatar } from 'tamagui';
import { Settings, LogOut } from 'lucide-react-native';
import type { UserRole } from '@/contexts/AuthProvider';

interface UserHeaderProps {
  user: { firstName?: string; imageUrl?: string } | null;
  role: UserRole;
  organization?: { name?: string } | null;
  onSettings: () => void;
  onSignOut: () => void;
}

const roleColors: Record<UserRole, string> = {
  clinician: '#1E3A8A',
  parent: '#10B981',
  admin: '#EF4444',
  chc_worker: '#F59E0B',
};

export function UserHeader({
  user,
  role,
  organization,
  onSettings,
  onSignOut,
}: UserHeaderProps) {
  return (
    <XStack ai="center" jc="space-between">
      <XStack ai="center" space="$4">
        <Avatar circular size="$5">
          <Avatar.Image src={user?.imageUrl} />
          <Avatar.Fallback bc={roleColors[role] + '40'} />
        </Avatar>
        <YStack>
          <Text fontSize="$6" fontWeight="700">
            {user?.firstName || 'User'}
          </Text>
          <XStack ai="center" space="$2">
            <Text
              fontSize="$2"
              fontWeight="600"
              color={roleColors[role]}
              bg={roleColors[role] + '20'}
              px="$2"
              py="$1"
              br="$2"
            >
              {role.toUpperCase()}
            </Text>
            {organization?.name && (
              <Text fontSize="$4" color="#64748B">
                {organization.name}
              </Text>
            )}
          </XStack>
        </YStack>
      </XStack>

      <XStack space="$2">
        <Button
          size="$3"
          chromeless
          icon={<Settings size={20} color="#64748B" />}
          onPress={onSettings}
        />
        <Button
          size="$3"
          chromeless
          icon={<LogOut size={20} color="#64748B" />}
          onPress={onSignOut}
        />
      </XStack>
    </XStack>
  );
}
