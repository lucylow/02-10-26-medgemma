/**
 * Workflow Builder tab — Drag-and-drop multi-agent MedGemma pipeline builder
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WorkflowBuilder } from '@/components/workflow';

export default function WorkflowScreen() {
  return (
    <View style={styles.container}>
      <WorkflowBuilder />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
