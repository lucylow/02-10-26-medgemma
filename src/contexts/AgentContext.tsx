import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { smartAgentRouting, analyzePriority } from '@/lib/routing/SmartRouter';

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

const initialState: AgentState = {
  currentCaseId: null,
  pipeline: [],
  routePlan: [],
  priority: 'low',
  isStreaming: false,
  mode: 'online',
};

const agentReducer = (state: AgentState, action: AgentAction): AgentState => {
  switch (action.type) {
    case 'START_PIPELINE':
      return {
        ...state,
        currentCaseId: action.caseId,
        pipeline: action.plan.map((id) => ({
          id,
          status: 'pending' as AgentStatus,
          confidence: 0,
          output: {},
          duration: 0,
          timestamp: new Date().toISOString(),
          progress: 0,
          stream: '',
        })),
        routePlan: action.plan,
        priority: action.priority,
        mode: action.mode,
      };

    case 'AGENT_START':
      return {
        ...state,
        pipeline: state.pipeline.map((agent) =>
          agent.id === action.agentId ? { ...agent, status: 'running' } : agent
        ),
        isStreaming: true,
      };

    case 'AGENT_STREAMING':
      return {
        ...state,
        pipeline: state.pipeline.map((agent) =>
          agent.id === action.agentId
            ? {
                ...agent,
                output: { ...agent.output, stream: action.token },
                stream: ((agent.stream || '') + action.token).replace(/undefined/g, ''),
                status: 'streaming' as AgentStatus,
                progress: Math.min(95, (agent.progress || 0) + 1),
              }
            : agent
        ),
      };

    case 'AGENT_PROGRESS':
      return {
        ...state,
        pipeline: state.pipeline.map((agent) =>
          agent.id === action.agentId ? { ...agent, progress: action.progress } : agent
        ),
      };

    case 'AGENT_COMPLETE':
      return {
        ...state,
        pipeline: state.pipeline.map((agent) =>
          agent.id === action.agentId
            ? {
                ...agent,
                status: 'success',
                confidence: 0.87,
                output: action.output,
                duration: action.duration,
              }
            : agent
        ),
        isStreaming: false,
      };

    case 'AGENT_ERROR':
      return {
        ...state,
        pipeline: state.pipeline.map((agent) =>
          agent.id === action.agentId ? { ...agent, status: 'failed' } : agent
        ),
        isStreaming: false,
      };

    case 'RESET_PIPELINE':
      return { ...initialState, mode: state.mode };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    default:
      return state;
  }
};

/** Simulate pipeline execution for demo; replace with real API calls in production */
async function runPipelineSimulation(
  dispatch: React.Dispatch<AgentAction>,
  plan: AgentType[],
  _input: string
) {
  for (const agentId of plan) {
    dispatch({ type: 'AGENT_START', agentId });
    await new Promise((r) => setTimeout(r, 400));

    if (agentId === 'medgemma') {
      const tokens = [
        'Analyzing observations... ',
        'Risk stratification in progress. ',
        'Evaluating developmental domains. ',
        'Generating evidence-based recommendations.',
      ];
      for (const token of tokens) {
        dispatch({ type: 'AGENT_STREAMING', agentId, token });
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    dispatch({
      type: 'AGENT_COMPLETE',
      agentId,
      output: { summary: `Processed by ${agentId}` },
      duration: 500 + Math.random() * 300,
    });
    await new Promise((r) => setTimeout(r, 200));
  }
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mode = navigator.onLine ? 'online' : 'offline';
    dispatch({ type: 'SET_MODE', mode });
    const onOnline = () => dispatch({ type: 'SET_MODE', mode: 'online' });
    const onOffline = () => dispatch({ type: 'SET_MODE', mode: 'offline' });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const startPipeline = useCallback(async (input: string, age: number) => {
    const caseId = `case_${Date.now()}`;
    const smartPlan = await smartAgentRouting(input, age);
    const priority = analyzePriority(input);
    const mode = typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';
    dispatch({ type: 'START_PIPELINE', caseId, plan: smartPlan, priority, mode });
    runPipelineSimulation(dispatch, smartPlan, input);
  }, []);

  const navigateToAgent = useCallback((_agent: AgentType) => {
    // Navigation handled by screen logic via useNavigate
  }, []);

  return (
    <AgentContext.Provider value={{ state, dispatch, startPipeline, navigateToAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within AgentProvider');
  }
  return context;
}
