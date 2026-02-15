/**
 * ConnectionLine — Bezier curve between workflow nodes (react-native-svg)
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { WorkflowNode } from '@/types/workflow';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 120;
const PORT_OFFSET_Y = 60;

interface ConnectionLineProps {
  fromNode: WorkflowNode;
  toNode: WorkflowNode;
}

export function ConnectionLine({ fromNode, toNode }: ConnectionLineProps) {
  const fromPort = {
    x: fromNode.x + NODE_WIDTH,
    y: fromNode.y + PORT_OFFSET_Y,
  };
  const toPort = {
    x: toNode.x,
    y: toNode.y + PORT_OFFSET_Y,
  };

  const cp1 = { x: fromPort.x + 80, y: fromPort.y };
  const cp2 = { x: toPort.x - 80, y: toPort.y };

  const path = `M ${fromPort.x} ${fromPort.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${toPort.x} ${toPort.y}`;

  return (
    <Svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
      }}
    >
      <Path
        d={path}
        stroke="#94A3B8"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
