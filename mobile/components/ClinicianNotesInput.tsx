import React from "react";
import { YStack, TextArea, Text } from "tamagui";

interface ClinicianNotesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ClinicianNotesInput({
  value,
  onChange,
  placeholder = "Add clinical notes or corrections...",
}: ClinicianNotesInputProps) {
  return (
    <YStack>
      <Text fontSize="$3" fontWeight="500" marginBottom="$2">
        Clinician Notes
      </Text>
      <TextArea
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        minHeight={100}
        padding="$3"
        backgroundColor="white"
        borderWidth={1}
        borderColor="#E2E8F0"
        borderRadius="$3"
      />
    </YStack>
  );
}
