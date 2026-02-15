/**
 * PediScreen AI Workflow Builder — Types for multi-agent MedGemma pipelines
 */

export type AgentType =
  | 'intake'
  | 'medgemma'
  | 'embedding'
  | 'temporal'
  | 'safety'
  | 'fhir'
  | 'voice';

export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface Connection {
  from: string;
  to: string;
}

export interface WorkflowNode {
  id: string;
  type: AgentType;
  x: number;
  y: number;
  config: Record<string, unknown>;
  status: NodeStatus;
}

export interface WorkflowValidation {
  isValid: boolean;
  issues: string[];
  executionOrder: string[];
}

export interface WorkflowExport {
  nodes: Omit<WorkflowNode, 'x' | 'y'>[];
  connections: Connection[];
  version: string;
  validated: WorkflowValidation;
}
