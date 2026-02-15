import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, XStack, Text, Card, Switch } from 'tamagui';
import { Settings, Cpu, Wifi, Shield } from 'lucide-react-native';
import { useState } from 'react';

export default function SettingsScreen() {
  const [offlineMode, setOfflineMode] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <YStack p="$6" space="$6">
        <XStack ai="center" space="$3">
          <Settings size={28} color="#1E3A8A" />
          <Text fontSize="$7" fontWeight="800" color="#1E293B">
            Model Config
          </Text>
        </XStack>

        <Card p="$4" bg="white" br="$4" elevate>
          <YStack space="$4">
            <XStack ai="center" jc="space-between">
              <XStack ai="center" space="$3">
                <Cpu size={22} color="#64748B" />
                <YStack>
                  <Text fontSize="$5" fontWeight="600">
                    MedGemma 4B-IT
                  </Text>
                  <Text fontSize="$3" color="#64748B">
                    google/medgemma-4b-it-pediscreen-lora
                  </Text>
                </YStack>
              </XStack>
            </XStack>
            <XStack ai="center" jc="space-between">
              <XStack ai="center" space="$3">
                <Wifi size={22} color="#64748B" />
                <Text fontSize="$5" fontWeight="600">
                  Offline fallback
                </Text>
              </XStack>
              <Switch
                checked={offlineMode}
                onCheckedChange={setOfflineMode}
              />
            </XStack>
            <XStack ai="center" jc="space-between">
              <XStack ai="center" space="$3">
                <Shield size={22} color="#64748B" />
                <Text fontSize="$5" fontWeight="600">
                  Live streaming
                </Text>
              </XStack>
              <Switch
                checked={streamingEnabled}
                onCheckedChange={setStreamingEnabled}
              />
            </XStack>
          </YStack>
        </Card>

        <Text fontSize="$4" color="#94A3B8">
          Temperature: 0.1 • Top-p: 0.9 • Max tokens: 512
        </Text>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
});
