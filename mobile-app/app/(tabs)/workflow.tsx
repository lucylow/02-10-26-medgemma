/**
 * Workflow Builder tab — Drag-and-drop multi-agent MedGemma pipeline builder
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { WorkflowBuilder } from '@/components/workflow';

export default function WorkflowScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <WorkflowBuilder />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, minHeight: 600 },
});
