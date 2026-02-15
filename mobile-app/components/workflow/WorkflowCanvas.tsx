/**
 * WorkflowCanvas — Canvas with nodes, connections, grid background
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import Svg, { Line } from 'react-native-svg';
import type { WorkflowNode, Connection } from '@/types/workflow';
import { WorkflowNode as WorkflowNodeComponent } from './WorkflowNode';
import { ConnectionLine } from './ConnectionLine';
import { AGENT_CONFIG } from './workflowConfig';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  connections: Connection[];
  onMoveNode: (id: string, x: number, y: number) => void;
  onDeleteNode: (id: string) => void;
  onAddConnection: (from: string, to: string) => void;
  onAddNodeAtPosition: (x: number, y: number) => void;
  onClear: () => void;
  selectedAgentType: string | null; // AgentType when user has selected from palette
}

export function WorkflowCanvas({
  nodes,
  connections,
  onMoveNode,
  onDeleteNode,
  onAddConnection,
  onAddNodeAtPosition,
  onClear,
  selectedAgentType,
}: WorkflowCanvasProps) {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const canvasWidth = Math.max(400, width - 220);
  const canvasHeight = Math.max(400, height - 200);

  const handleConnectStart = useCallback((id: string) => {
    setConnectingFrom(id);
  }, []);

  const handleConnectEnd = useCallback(
    (fromId: string, toId: string) => {
      if (fromId !== toId) {
        onAddConnection(fromId, toId);
      }
      setConnectingFrom(null);
    },
    [onAddConnection]
  );

  const handleCanvasPress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (selectedAgentType) {
        onAddNodeAtPosition(event.nativeEvent.locationX, event.nativeEvent.locationY);
      }
    },
    [selectedAgentType, onAddNodeAtPosition]
  );

  return (
    <YStack flex={1} position="relative" bg="#F0F4F8" minHeight={400}>
      <GridBackground width={canvasWidth} height={canvasHeight} />

      <View style={[styles.svgLayer, { width: canvasWidth, height: canvasHeight }]}>
        {connections.map(({ from, to }, i) => {
          const fromNode = nodes.find((n) => n.id === from);
          const toNode = nodes.find((n) => n.id === to);
          if (!fromNode || !toNode) return null;
          return <ConnectionLine key={`${from}-${to}-${i}`} fromNode={fromNode} toNode={toNode} />;
        })}
      </View>

      <Pressable
        style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}
        onPress={handleCanvasPress}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {nodes.map((node) => (
            <WorkflowNodeComponent
              key={node.id}
              node={node}
              isDragging={false}
              onMove={onMoveNode}
              onDelete={onDeleteNode}
              onConnectStart={handleConnectStart}
              onConnectEnd={handleConnectEnd}
              connectingFrom={connectingFrom}
            />
          ))}
        </View>
      </Pressable>

      {selectedAgentType && (
        <YStack
          position="absolute"
          bottom={16}
          left={16}
          bg="rgba(30,58,138,0.9)"
          p="$3"
          br="$3"
        >
          <Text color="white" fontSize="$3">
            Tap canvas to place{' '}
            {AGENT_CONFIG[selectedAgentType as keyof typeof AGENT_CONFIG]?.label ?? selectedAgentType}
          </Text>
        </YStack>
      )}

      <XStack
        position="absolute"
        bottom={16}
        right={16}
        space="$2"
      >
        <Button size="$2" bg="#64748B" color="white" onPress={onClear}>
          Clear
        </Button>
      </XStack>
    </YStack>
  );
}

function GridBackground({ width, height }: { width: number; height: number }) {
  const spacing = 24;
  const lines = [];
  for (let i = 0; i <= width / spacing; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        x1={i * spacing}
        y1={0}
        x2={i * spacing}
        y2={height}
        stroke="#E2E8F0"
        strokeWidth={0.5}
      />
    );
  }
  for (let i = 0; i <= height / spacing; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        x1={0}
        y1={i * spacing}
        x2={width}
        y2={i * spacing}
        stroke="#E2E8F0"
        strokeWidth={0.5}
      />
    );
  }

  return (
    <Svg
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents="none"
    >
      {lines}
    </Svg>
  );
}

const styles = StyleSheet.create({
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  canvas: {
    position: 'relative',
  },
});
