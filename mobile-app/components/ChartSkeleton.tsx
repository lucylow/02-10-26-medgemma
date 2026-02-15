import React from 'react';
import { View, StyleSheet } from 'react-native';
import { YStack, XStack, Card } from 'tamagui';

function SkeletonBox({ width, height }: { width: number | string; height: number }) {
  return (
    <View
      style={[
        styles.skeleton,
        { width: typeof width === 'string' ? width : width, height },
      ]}
    />
  );
}

export function ChartSkeleton() {
  return (
    <YStack flex={1} p="$4" space="$6">
      <XStack space="$3" flexWrap="wrap">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} flex={1} minWidth={80} p="$4" br="$4" bg="#F1F5F9">
            <XStack ai="center" space="$3">
              <SkeletonBox width={36} height={36} />
              <YStack space="$1">
                <SkeletonBox width={40} height={16} />
                <SkeletonBox width={60} height={12} />
              </YStack>
            </XStack>
          </Card>
        ))}
      </XStack>

      <Card p="$6" br="$4" bg="white" elevate>
        <SkeletonBox width="100%" height={24} />
        <SkeletonBox width="60%" height={16} />
        <YStack mt="$6" space="$4">
          <SkeletonBox width="100%" height={120} />
          <SkeletonBox width="100%" height={80} />
        </YStack>
      </Card>

      <XStack space="$4">
        <Card flex={1} p="$6" br="$4" bg="white" elevate>
          <SkeletonBox width="80%" height={20} />
          <SkeletonBox width="100%" height={150} />
        </Card>
        <Card flex={1} p="$6" br="$4" bg="white" elevate>
          <SkeletonBox width="70%" height={20} />
          <SkeletonBox width="100%" height={150} />
        </Card>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
});
