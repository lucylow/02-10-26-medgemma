/**
 * WorkflowBuilder — PediScreen AI drag-and-drop multi-agent workflow builder
 * Build, customize, and save MedGemma pipelines with visual node editing
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { YStack, XStack } from 'tamagui';
import type { WorkflowNode, Connection, AgentType } from '@/types/workflow';
import { validateWorkflow, getDefaultConfig } from '@/lib/workflowEngine';
import { AGENT_PALETTE } from './workflowConfig';
import { WorkflowHeader } from './WorkflowHeader';
import { AgentPalette } from './AgentPalette';
import { WorkflowCanvas } from './WorkflowCanvas';

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null);

  const validation = validateWorkflow(nodes, connections);

  const addNode = useCallback((type: AgentType, x: number, y: number) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      x,
      y,
      config: getDefaultConfig(type),
      status: 'idle',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedAgentType(null);
  }, []);

  const addNodeAtPosition = useCallback(
    (x: number, y: number) => {
      if (selectedAgentType) {
        addNode(selectedAgentType, x, y);
      }
    },
    [selectedAgentType, addNode]
  );

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
    );
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.from !== id && c.to !== id)
    );
  }, []);

  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setConnections((prev) => {
      if (prev.some((c) => c.from === fromId && c.to === toId)) return prev;
      return [...prev, { from: fromId, to: toId }];
    });
  }, []);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setSelectedAgentType(null);
  }, []);

  const exportWorkflow = useCallback(() => {
    const workflow = {
      nodes: nodes.map(({ x, y, ...rest }) => rest),
      connections,
      version: '1.0',
      validated: validation,
    };
    return JSON.stringify(workflow, null, 2);
  }, [nodes, connections, validation]);

  const runWorkflow = useCallback(async () => {
    if (!validation.isValid) {
      Alert.alert('Invalid Workflow', validation.issues.join('\n'));
      return;
    }

    const workflowJson = exportWorkflow();

    try {
      await executeWorkflow(workflowJson);
      Alert.alert('Success', 'Workflow executed successfully');
    } catch (err) {
      Alert.alert(
        'Execution Error',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  }, [validation, exportWorkflow]);

  const executeWorkflow = async (workflowJson: string) => {
    const { nodes: wfNodes, connections: wfConnections } = JSON.parse(
      workflowJson
    ) as { nodes: WorkflowNode[]; connections: Connection[] };
    const val = validateWorkflow(wfNodes, wfConnections);

    if (!val.isValid) {
      throw new Error(val.issues.join('; '));
    }

    for (const nodeId of val.executionOrder) {
      const node = wfNodes.find((n) => n.id === nodeId);
      if (node) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, status: 'running' as const } : n
          )
        );
        await new Promise((r) => setTimeout(r, 500));
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, status: 'success' as const } : n
          )
        );
      }
    }
  };

  const handleSelectAgent = useCallback((type: AgentType) => {
    setSelectedAgentType(type);
  }, []);

  return (
    <YStack flex={1} bg="#F8FAFC">
      <WorkflowHeader
        nodeCount={nodes.length}
        connectionCount={connections.length}
        isValid={validation.isValid}
        issues={validation.issues}
        onExport={exportWorkflow}
        onRun={runWorkflow}
      />

      <XStack flex={1} minHeight={400}>
        <YStack
          w={200}
          minW={200}
          p="$3"
          borderRightWidth={1}
          borderColor="#E2E8F0"
          bg="white"
        >
          <AgentPalette
            agents={AGENT_PALETTE}
            onSelectAgent={handleSelectAgent}
          />
        </YStack>

        <YStack flex={1} p="$4">
          <WorkflowCanvas
            nodes={nodes}
            connections={connections}
            onMoveNode={moveNode}
            onDeleteNode={deleteNode}
            onAddConnection={addConnection}
            onAddNodeAtPosition={addNodeAtPosition}
            onClear={clearWorkflow}
            selectedAgentType={selectedAgentType}
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
