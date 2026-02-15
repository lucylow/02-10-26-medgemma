/**
 * PediScreen AI Agent Workflow Visualization — Types for live pipeline viz
 */

export type AgentNodeType =
  | 'voice'
  | 'intake'
  | 'embedding'
  | 'medgemma'
  | 'temporal'
  | 'safety'
  | 'fhir'
  | 'summarizer';

export type AgentNodeStatus =
  | 'idle'
  | 'running'
  | 'streaming'
  | 'success'
  | 'error';

export type ConnectionStatus = 'active' | 'completed' | 'error' | 'idle';

export interface AgentNode {
  id: string;
  type: AgentNodeType;
  status: AgentNodeStatus;
  position: { x: number; y: number };
  confidence?: number;
  progress?: number;
}

export interface WorkflowConnection {
  from: string;
  to: string;
  status: ConnectionStatus;
}
