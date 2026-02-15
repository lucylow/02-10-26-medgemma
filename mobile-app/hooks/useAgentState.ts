import { create } from 'zustand';

export type AgentType =
  | 'intake'
  | 'embedding'
  | 'medgemma'
  | 'safety'
  | 'summarizer';

export type AgentStatus =
  | 'pending'
  | 'running'
  | 'streaming'
  | 'success'
  | 'failed'
  | 'offline';

export interface Agent {
  id: AgentType;
  status: AgentStatus;
  confidence: number;
  output: Record<string, unknown>;
  duration: number;
  timestamp: string;
  progress?: number;
  stream?: string;
}

export interface AgentState {
  currentCaseId: string | null;
  pipeline: Agent[];
  routePlan: AgentType[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isStreaming: boolean;
  mode: 'online' | 'hybrid' | 'offline';
}

interface AgentStore extends AgentState {
  startPipeline: (
    caseId: string,
    plan: AgentType[],
    priority: AgentState['priority'],
    mode: AgentState['mode']
  ) => void;
  updateAgent: (
    agentId: AgentType,
    update: Partial<Pick<Agent, 'output' | 'confidence' | 'status' | 'stream' | 'duration'>>
  ) => void;
  streamToken: (agentId: AgentType, token: string) => void;
  completeAgent: (
    agentId: AgentType,
    output: Record<string, unknown>,
    duration: number
  ) => void;
  failAgent: (agentId: AgentType) => void;
  resetPipeline: () => void;
  setMode: (mode: AgentState['mode']) => void;
}

const defaultPlan: AgentType[] = [
  'intake',
  'embedding',
  'medgemma',
  'safety',
  'summarizer',
];

export const useAgentState = create<AgentStore>((set) => ({
  currentCaseId: null,
  pipeline: [],
  routePlan: [],
  priority: 'low',
  isStreaming: false,
  mode: 'online',

  startPipeline: (caseId, plan, priority, mode) =>
    set({
      currentCaseId: caseId,
      pipeline: (plan.length ? plan : defaultPlan).map((id) => ({
        id,
        status: 'pending' as AgentStatus,
        confidence: 0,
        output: {},
        duration: 0,
        timestamp: new Date().toISOString(),
        progress: 0,
        stream: '',
      })),
      routePlan: plan.length ? plan : defaultPlan,
      priority,
      mode,
      isStreaming: true,
    }),

  updateAgent: (agentId, update) =>
    set((state) => ({
      pipeline: state.pipeline.map((a) =>
        a.id === agentId ? { ...a, ...update } : a
      ),
    })),

  streamToken: (agentId, token) =>
    set((state) => ({
      pipeline: state.pipeline.map((a) =>
        a.id === agentId
          ? {
              ...a,
              stream: ((a.stream || '') + token).replace(/undefined/g, ''),
              status: 'streaming' as AgentStatus,
              progress: Math.min(95, (a.progress || 0) + 1),
            }
          : a
      ),
    })),

  completeAgent: (agentId, output, duration) =>
    set((state) => ({
      pipeline: state.pipeline.map((a) =>
        a.id === agentId
          ? {
              ...a,
              status: 'success',
              confidence: (output.confidence as number) ?? 0.87,
              output,
              duration,
            }
          : a
      ),
      isStreaming: false,
    })),

  failAgent: (agentId) =>
    set((state) => ({
      pipeline: state.pipeline.map((a) =>
        a.id === agentId ? { ...a, status: 'failed' } : a
      ),
      isStreaming: false,
    })),

  resetPipeline: () =>
    set((state) => ({
      currentCaseId: null,
      pipeline: [],
      routePlan: [],
      isStreaming: false,
      mode: state.mode,
    })),

  setMode: (mode) => set({ mode }),
}));
