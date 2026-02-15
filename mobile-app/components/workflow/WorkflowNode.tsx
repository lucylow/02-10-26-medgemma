/**
 * WorkflowNode — Draggable agent node with ports and status
 */

import React, { useRef } from 'react';
import { View, PanResponder, Pressable, StyleSheet } from 'react-native';
import { Card, Text, Badge, Button, XStack } from 'tamagui';
import { X } from 'lucide-react-native';
import type { WorkflowNode as WorkflowNodeType } from '@/types/workflow';
import { AGENT_CONFIG } from './workflowConfig';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 120;

const STATUS_COLORS: Record<string, string> = {
  idle: '#64748B',
  running: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
};

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isDragging: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onConnectStart: (id: string) => void;
  onConnectEnd: (fromId: string, toId: string) => void;
  connectingFrom: string | null;
}

export function WorkflowNode({
  node,
  isDragging,
  onMove,
  onDelete,
  onConnectStart,
  onConnectEnd,
  connectingFrom,
}: WorkflowNodeProps) {
  const config = AGENT_CONFIG[node.type];
  const Icon = config.icon;
  const statusColor = STATUS_COLORS[node.status] ?? STATUS_COLORS.idle;

  const lastOffset = useRef({ x: node.x, y: node.y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastOffset.current = { x: node.x, y: node.y };
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, lastOffset.current.x + gestureState.dx);
        const newY = Math.max(0, lastOffset.current.y + gestureState.dy);
        onMove(node.id, newX, newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const newX = Math.max(0, lastOffset.current.x + gestureState.dx);
        const newY = Math.max(0, lastOffset.current.y + gestureState.dy);
        lastOffset.current = { x: newX, y: newY };
      },
    })
  ).current;

  const handleOutputPress = () => {
    if (connectingFrom) {
      onConnectEnd(connectingFrom, node.id);
    } else {
      onConnectStart(node.id);
    }
  };

  return (
    <View
      style={[
        styles.node,
        {
          left: node.x,
          top: node.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          opacity: isDragging ? 0.9 : 1,
          transform: [{ scale: isDragging ? 1.02 : 1 }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Card
        w={NODE_WIDTH}
        h={NODE_HEIGHT}
        p="$4"
        br="$3"
        bg={config.color}
        elevate
        pressStyle={{ scale: 0.98 }}
      >
        <XStack ai="center" space="$2" mb="$2">
          <Icon size={16} color="white" />
          <Text fontSize="$4" color="white" fontWeight="600">
            {config.label}
          </Text>
        </XStack>

        <Badge size="$1" bg="rgba(255,255,255,0.3)" color="white" mb="$2">
          {node.status.toUpperCase()}
        </Badge>

        <XStack jc="space-between" mt="$3" ai="center">
          <View style={styles.port} />
          <Pressable onPress={handleOutputPress} style={styles.portButton}>
            <View style={[styles.port, styles.portOutput]} />
          </Pressable>
        </XStack>

        <Button
          size="$2"
          circular
          bg="rgba(255,255,255,0.2)"
          color="white"
          position="absolute"
          top={4}
          right={4}
          onPress={() => onDelete(node.id)}
          icon={<X size={14} />}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
  },
  port: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  portOutput: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  portButton: {
    padding: 4,
  },
});
