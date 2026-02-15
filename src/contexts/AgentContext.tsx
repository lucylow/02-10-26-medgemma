/**
 * AgentContext — Multi-agent orchestration state (powered by useAgentOrchestrator hooks)
 * Provides backward-compatible interface for LivePipelineStatus, AgentPipelineScreen, etc.
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';
import { AgentOrchestratorContext } from './AgentOrchestratorContext';

export type AgentType = 'intake' | 'medgemma' | 'temporal' | 'embedding' | 'safety' | 'summarizer';
export type AgentStatus = 'pending' | 'running' | 'streaming' | 'success' | 'failed' | 'error' | 'offline';

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

export type ConnectionMode = 'online' | 'hybrid' | 'offline';

export interface AgentState {
  currentCaseId: string | null;
  pipeline: Agent[];
  routePlan: AgentType[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isStreaming: boolean;
  mode: ConnectionMode;
}

export type AgentAction =
  | { type: 'START_PIPELINE'; caseId: string; plan: AgentType[]; priority: AgentState['priority']; mode: ConnectionMode }
  | { type: 'AGENT_START'; agentId: AgentType }
  | { type: 'AGENT_STREAMING'; agentId: AgentType; token: string }
  | { type: 'AGENT_PROGRESS'; agentId: AgentType; progress: number }
  | { type: 'AGENT_COMPLETE'; agentId: AgentType; output: Record<string, unknown>; duration: number }
  | { type: 'AGENT_ERROR'; agentId: AgentType; error: string }
  | { type: 'RESET_PIPELINE' }
  | { type: 'SET_MODE'; mode: ConnectionMode };

const AgentContext = createContext<{
  state: AgentState;
  dispatch: React.Dispatch<AgentAction>;
  startPipeline: (input: string, age: number) => Promise<void>;
  navigateToAgent: (agent: AgentType) => void;
} | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const orch = useAgentOrchestrator('', 24);
  const { state } = orch;

  const adaptedState: AgentState = {
    currentCaseId: state.caseId,
    pipeline: state.pipeline
      .map((id) => state.agents[id])
      .filter(Boolean)
      .map((a) => ({
        id: a.id,
        status: a.status === 'error' ? 'failed' : a.status,
        confidence: a.confidence,
        output: a.output,
        duration: a.duration,
        timestamp: a.timestamp,
        progress: a.progress,
        stream: (a.output?.stream as string) ?? '',
      })),
    routePlan: state.pipeline,
    priority: state.priority,
    isStreaming: Object.values(state.agents).some((a) => a.status === 'streaming'),
    mode: state.mode,
  };

  const startPipeline = useCallback(
    async (input: string, age: number) => {
      await orch.orchestrate(input, age);
    },
    [orch]
  );

  const dispatch = useCallback(
    (action: AgentAction) => {
      if (action.type === 'RESET_PIPELINE') orch.reset();
    },
    [orch]
  );

  const navigateToAgent = useCallback((_agent: AgentType) => {
    // Navigation handled by screen logic via useNavigate
  }, []);

  return (
    <AgentOrchestratorContext.Provider value={orch}>
      <AgentContext.Provider value={{ state: adaptedState, dispatch, startPipeline, navigateToAgent }}>
        {children}
      </AgentContext.Provider>
    </AgentOrchestratorContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentProvider');
  }
  return context;
}
