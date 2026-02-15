/**
 * Progressive Disclosure — Expandable sections for clinician UX
 */

import React, { useState } from 'react';
import { YStack, Button, ScrollView } from 'tamagui';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

interface DisclosureSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function DisclosureSection({
  title,
  children,
  defaultOpen = false,
}: DisclosureSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <YStack gap="$2" mb="$4">
      <Button
        onPress={() => setOpen(!open)}
        icon={open ? <ChevronUp size={20} color="#1E293B" /> : <ChevronDown size={20} color="#1E293B" />}
        justifyContent="flex-start"
        bg="#F8FAFC"
        color="#1E293B"
        borderColor="#E2E8F0"
      >
        {title}
      </Button>
      {open && (
        <ScrollView
          style={{ maxHeight: 300 }}
          contentContainerStyle={{ padding: 16, backgroundColor: '#F1F5F9', borderRadius: 8 }}
        >
          {children}
        </ScrollView>
      )}
    </YStack>
  );
}
