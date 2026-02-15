/**
 * Connection path between agent nodes — Bezier curve with status styling
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { WorkflowConnection } from '@/types/agentWorkflow';

interface ConnectionPathProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  status: WorkflowConnection['status'];
}

const STROKE_COLORS: Record<WorkflowConnection['status'], string> = {
  active: '#3B82F6',
  completed: '#10B981',
  error: '#EF4444',
  idle: '#E2E8F0',
};

export function ConnectionPath({ from, to, status }: ConnectionPathProps) {
  const strokeColor = STROKE_COLORS[status];
  const strokeOpacity = status === 'active' ? 1 : 0.6;

  // Bezier control points for smooth curve
  const cp1x = from.x + 80;
  const cp1y = from.y;
  const cp2x = to.x - 80;
  const cp2y = to.y;

  const pathD = `M ${from.x + 48} ${from.y + 48} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x + 48} ${to.y + 48}`;

  return (
    <>
      <Path
        d={pathD}
        stroke={strokeColor}
        strokeWidth={12}
        strokeOpacity={0.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={pathD}
        stroke={strokeColor}
        strokeWidth={4}
        strokeOpacity={strokeOpacity}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}
