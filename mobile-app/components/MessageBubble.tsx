/**
 * Message bubble for agent chat - user/agent/system/HITL variants.
 */

import React, { useEffect } from 'react';
import { XStack, YStack, Text, Badge } from 'tamagui';
import { Clock } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RiskBadge } from './RiskBadge';
import type { RiskLevel } from './RiskBadge';

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system' | 'hitl';
  content: string;
  timestamp: string;
  confidence?: number;
  risk?: RiskLevel;
  isStreaming?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
}

interface MessageBubbleProps {
  message: Message;
}

const ROLE_AVATARS: Record<Message['role'], string> = {
  user: '👤',
  agent: '🤖',
  system: '📋',
  hitl: '👨‍⚕️',
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const scale = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 250 });
  }, [message.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const isUser = message.role === 'user';

  const bubbleBg =
    message.role === 'user'
      ? '#3B82F6'
      : message.role === 'agent'
        ? 'white'
        : message.role === 'hitl'
          ? '#ECFDF5'
          : '#F8FAFC';

  const bubbleBorder =
    message.role === 'agent' ? '#E5E7EB' : message.role === 'hitl' ? '#A7F3D0' : 'transparent';

  return (
    <Animated.View style={animatedStyle}>
      <XStack
        w="100%"
        mb="$4"
        ai="flex-start"
        flexDirection={isUser ? 'row-reverse' : 'row'}
        px="$4"
      >
        <YStack
          w={40}
          h={40}
          ai="center"
          jc="center"
          br="$4"
          bg="#E5E7EB"
          flexShrink={0}
          mt="$1"
        >
          <Text fontSize="$6">{ROLE_AVATARS[message.role]}</Text>
        </YStack>

        <YStack
          flex={1}
          ml={isUser ? 0 : '$3'}
          mr={isUser ? '$3' : 0}
          maxWidth="85%"
          p="$4"
          br="$6"
          bg={bubbleBg}
          borderWidth={1}
          borderColor={bubbleBorder}
          elevate={message.role === 'agent'}
        >
          <Text
            fontSize="$4"
            lineHeight={22}
            color={isUser ? 'white' : '#1E293B'}
            style={{ flexWrap: 'wrap' }}
          >
            {message.content}
          </Text>

          <XStack ai="center" space="$2" mt="$2" opacity={0.8}>
            <Clock size={12} color={isUser ? 'rgba(255,255,255,0.8)' : '#64748B'} />
            <Text
              fontSize="$2"
              color={isUser ? 'rgba(255,255,255,0.9)' : '#64748B'}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            {message.confidence !== undefined && (
              <Badge size="$1" bg="#DBEAFE" color="#1E40AF" ml="auto">
                {Math.round(message.confidence * 100)}%
              </Badge>
            )}

            {message.risk && (
              <RiskBadge risk={message.risk} size="$1" confidence={message.confidence} />
            )}
          </XStack>
        </YStack>
      </XStack>
    </Animated.View>
  );
}
