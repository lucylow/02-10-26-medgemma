/**
 * Typing indicator for agent chat - animated dots.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { Brain } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface TypingIndicatorProps {
  agentType?: string;
}

export function TypingIndicator({ agentType = 'medgemma' }: TypingIndicatorProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <XStack
      bg="white"
      p="$5"
      br="$6"
      mx="$4"
      mb="$4"
      ai="center"
      space="$3"
      borderWidth={1}
      borderColor="#E5E7EB"
      elevate
    >
      <YStack
        w={36}
        h={36}
        br={18}
        bg="#3B82F6"
        ai="center"
        jc="center"
      >
        <Brain size={18} color="white" />
      </YStack>

      <Animated.View style={animatedStyle}>
        <XStack space="$1" ai="center">
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#9CA3AF',
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#9CA3AF',
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#9CA3AF',
            }}
          />
        </XStack>
      </Animated.View>

      <Text fontSize="$3" color="#6B7280" fontStyle="italic" flex={1}>
        MedGemma {agentType} is analyzing...
      </Text>
    </XStack>
  );
}
