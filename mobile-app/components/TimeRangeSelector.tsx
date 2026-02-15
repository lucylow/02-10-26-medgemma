import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack, Text } from 'tamagui';

type TimeRange = '30d' | '90d' | '6m' | 'all';

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  onChange: (range: TimeRange) => void;
}

const options: { value: TimeRange; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '6m', label: '6 months' },
  { value: 'all', label: 'All' },
];

export function TimeRangeSelector({ timeRange, onChange }: TimeRangeSelectorProps) {
  return (
    <XStack space="$2" flexWrap="wrap">
      {options.map(({ value, label }) => {
        const isActive = timeRange === value;
        return (
          <TouchableOpacity key={value} onPress={() => onChange(value)} activeOpacity={0.7}>
            <XStack
              px="$4"
              py="$2"
              br="$4"
              bg={isActive ? '#1E3A8A' : '#F1F5F9'}
              ai="center"
              jc="center"
            >
              <Text
                fontSize="$4"
                fontWeight={isActive ? '700' : '500'}
                color={isActive ? 'white' : '#64748B'}
              >
                {label}
              </Text>
            </XStack>
          </TouchableOpacity>
        );
      })}
    </XStack>
  );
}
