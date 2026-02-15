import React from "react";
import { YStack, XStack, Button } from "tamagui";
import { CheckCircle, XCircle, Edit3, ShieldAlert } from "lucide-react-native";

interface ClinicianDecisionProps {
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onEscalate: () => void;
  disabled?: boolean;
}

export function ClinicianDecisionButtons({
  onApprove,
  onReject,
  onEdit,
  onEscalate,
  disabled = false,
}: ClinicianDecisionProps) {
  return (
    <YStack space="$3">
      <XStack space="$3">
        <Button
          flex={1}
          size="$5"
          backgroundColor="#10B981"
          color="white"
          icon={<CheckCircle size={20} color="white" />}
          onPress={onApprove}
          disabled={disabled}
        >
          Approve
        </Button>
        <Button
          flex={1}
          size="$5"
          backgroundColor="#EF4444"
          color="white"
          icon={<XCircle size={20} color="white" />}
          onPress={onReject}
          disabled={disabled}
        >
          Reject
        </Button>
      </XStack>
      <XStack space="$3">
        <Button
          flex={1}
          size="$4"
          variant="outlined"
          borderColor="#94A3B8"
          icon={<Edit3 size={16} color="#64748B" />}
          onPress={onEdit}
          disabled={disabled}
        >
          Edit
        </Button>
        <Button
          flex={1}
          size="$4"
          variant="outlined"
          backgroundColor="#F59E0B"
          borderColor="#F59E0B"
          color="white"
          icon={<ShieldAlert size={16} color="white" />}
          onPress={onEscalate}
          disabled={disabled}
        >
          Escalate
        </Button>
      </XStack>
    </YStack>
  );
}
