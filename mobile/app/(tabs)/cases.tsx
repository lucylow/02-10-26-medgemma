import React from "react";
import { YStack, Text, ScrollView, Card } from "tamagui";
import { useAuth } from "@/contexts/AuthProvider";
import { FileText } from "lucide-react-native";

export default function CasesAudit() {
  const { hasAccess } = useAuth();

  return (
    <YStack flex={1} padding="$6" backgroundColor="#F8FAFC" space="$6">
      <Text fontSize="$6" fontWeight="800" color="#1E293B">
        Audit Trail
      </Text>
      <Text fontSize="$3" color="$gray11">
        Complete decision trails for compliance
      </Text>

      {!hasAccess("view_audit") ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Text fontSize="$3" color="$gray10">
            Sign in as clinician to view audit trail.
          </Text>
        </YStack>
      ) : (
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack space="$4">
            <Card padding="$4" backgroundColor="white" borderRadius="$4">
              <YStack alignItems="center" space="$2">
                <FileText size={32} color="#94A3B8" />
                <Text fontSize="$3" color="$gray10">
                  Audit events load from API. Connect backend for full trail.
                </Text>
              </YStack>
            </Card>
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}
