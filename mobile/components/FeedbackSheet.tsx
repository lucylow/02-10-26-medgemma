import React, { useState } from "react";
import { YStack, XStack, Text, Button } from "tamagui";
import { Modal, Pressable } from "react-native";

interface FeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (score: number) => void;
}

export function FeedbackSheet({
  visible,
  onClose,
  onSubmit,
}: FeedbackSheetProps) {
  const [score, setScore] = useState(3);

  const handleSubmit = () => {
    onSubmit(score);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 }}
          onPress={(e) => e.stopPropagation()}
        >
          <YStack space="$4">
            <Text fontSize="$6" fontWeight="700">
              Rate AI Output Quality
            </Text>
            <Text fontSize="$3" color="$gray11">
              How accurate was the MedGemma draft? (1–5)
            </Text>
            <XStack space="$2" flexWrap="wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="$4"
                  backgroundColor={score === n ? "#3B82F6" : "#E2E8F0"}
                  color={score === n ? "white" : "#64748B"}
                  onPress={() => setScore(n)}
                >
                  {n}
                </Button>
              ))}
            </XStack>
            <XStack space="$3">
              <Button flex={1} onPress={onClose} variant="outlined">
                Cancel
              </Button>
              <Button flex={1} onPress={handleSubmit} backgroundColor="#3B82F6">
                Submit
              </Button>
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
