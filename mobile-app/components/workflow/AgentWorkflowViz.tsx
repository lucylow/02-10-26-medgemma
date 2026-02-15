/**
 * PediScreen AI Agent Workflow Visualization — Live pipeline with SVG paths
 */

import React, { useMemo } from 'react';
import { View, ScrollView, Dimensions, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import { YStack, XStack, Text, Badge } from 'tamagui';
import { ConnectionPath } from './ConnectionPath';
import { AgentNodeViz } from './AgentNodeViz';
import { WorkflowLegend } from './WorkflowLegend';
import type { AgentNode, WorkflowConnection } from '@/types/agentWorkflow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_HEIGHT = 280;
const CANVAS_WIDTH = Math.max(SCREEN_WIDTH * 1.2, 800);

interface AgentWorkflowVizProps {
  pipeline: AgentNode[];
  connections: WorkflowConnection[];
  onNodePress?: (nodeId: string) => void;
  height?: number;
}

function computeNodePositions(pipeline: AgentNode[]): AgentNode[] {
  const count = pipeline.length;
  const spacing = CANVAS_WIDTH / (count + 1);
  return pipeline.map((node, i) => ({
    ...node,
    position: {
      x: spacing * (i + 1) - 48,
      y: CANVAS_HEIGHT / 2 - 48,
    },
  }));
}

export function AgentWorkflowViz({
  pipeline,
  connections,
  onNodePress,
  height = CANVAS_HEIGHT,
}: AgentWorkflowVizProps) {
  const nodesWithPositions = useMemo(
    () =>
      pipeline.some((n) => n.position.x === 0 && n.position.y === 0)
        ? computeNodePositions(pipeline)
        : pipeline,
    [pipeline]
  );

  const completeCount = pipeline.filter((n) => n.status === 'success').length;

  return (
    <YStack
      flex={1}
      bg="#F8FAFC"
      br="$6"
      overflow="hidden"
      borderWidth={1}
      borderColor="#E2E8F0"
    >
      {/* HEADER */}
      <XStack
        bg="rgba(255,255,255,0.9)"
        borderBottomWidth={1}
        borderColor="#E2E8F0"
        px="$5"
        py="$4"
        ai="center"
      >
        <Text fontSize="$6" fontWeight="800" color="#0F172A">
          Live Agent Pipeline
        </Text>
        <Badge ml="auto" bg="#D1FAE5" color="#065F46" size="$2">
          {completeCount}/{pipeline.length} Complete
        </Badge>
      </XStack>

      {/* CANVAS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.canvas, { height }]}>
          <Svg
            width={CANVAS_WIDTH}
            height={height}
            style={StyleSheet.absoluteFill}
          >
            {connections.map((conn) => {
              const fromNode = nodesWithPositions.find((n) => n.id === conn.from);
              const toNode = nodesWithPositions.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              return (
                <ConnectionPath
                  key={`${conn.from}-${conn.to}`}
                  from={fromNode.position}
                  to={toNode.position}
                  status={conn.status}
                />
              );
            })}
          </Svg>
          {nodesWithPositions.map((node, index) => (
            <AgentNodeViz
              key={node.id}
              node={node}
              index={index}
              total={pipeline.length}
              onPress={() => onNodePress?.(node.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* LEGEND */}
      <XStack
        px="$5"
        py="$4"
        bg="rgba(255,255,255,0.6)"
        borderTopWidth={1}
        borderColor="#E2E8F0"
      >
        <WorkflowLegend pipeline={pipeline} />
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    minWidth: CANVAS_WIDTH,
  },
  canvas: {
    width: CANVAS_WIDTH,
    position: 'relative',
  },
});
