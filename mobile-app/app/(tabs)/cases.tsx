import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { FolderOpen, FileText } from 'lucide-react-native';

export default function CasesScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <XStack ai="center" space="$3">
          <FolderOpen size={28} color="#1E3A8A" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Longitudinal Cases
          </Text>
        </XStack>
        <Text fontSize="$4" color="#64748B">
          FHIR-integrated case history. Sync when online.
        </Text>

        <Card p="$6" bg="white" br="$4" elevate>
          <XStack ai="center" space="$4">
            <FileText size={40} color="#94A3B8" />
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="600" color="#64748B">
                No cases yet
              </Text>
              <Text fontSize="$4" color="#94A3B8" mt="$1">
                Complete a screening to build longitudinal FHIR records
              </Text>
            </YStack>
          </XStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
