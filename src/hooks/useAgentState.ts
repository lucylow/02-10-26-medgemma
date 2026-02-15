/**
 * useAgentState — Core agent state hook for multi-agent orchestration
 * PediScreen AI: Input → Smart Router → Agent Pipeline → CDS Results
 */

import { useReducer, useCallback, useEffect } from 'react';

export type AgentType =
  | 'intake'
  | 'embedding'
  | 'temporal'
  | 'medgemma'
  | 'safety'
  | 'summarizer';

export type AgentStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'streaming'
  | 'success'
  | 'error'
  | 'offline';

export interface AgentNode {
  id: AgentType;
  status: AgentStatus;
  confidence: number;
  progress: number;
  output: Record<string, unknown>;
  duration: number;
  timestamp: string;
  dependencies: AgentType[];
}

export interface AgentState {
  caseId: string | null;
  pipeline: AgentType[];
  agents: Record<AgentType, AgentNode>;
  currentAgent: AgentType | null;
  mode: 'online' | 'hybrid' | 'offline';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isComplete: boolean;
}

type AgentAction =
  | { type: 'INIT_PIPELINE'; caseId: string; pipeline: AgentType[] }
  | { type: 'AGENT_START'; agent: AgentType }
  | { type: 'AGENT_PROGRESS'; agent: AgentType; progress: number }
  | { type: 'AGENT_STREAM'; agent: AgentType; token: string }
  | { type: 'AGENT_SUCCESS'; agent: AgentType; output: Record<string, unknown>; duration: number }
  | { type: 'AGENT_ERROR'; agent: AgentType; error: string }
  | { type: 'SET_MODE'; mode: AgentState['mode'] }
  | { type: 'COMPLETE_CASE' }
  | { type: 'RESET' };

const initialState: AgentState = {
  caseId: null,
  pipeline: [],
  agents: {} as Record<AgentType, AgentNode>,
  currentAgent: null,
  mode: 'online',
  priority: 'low',
  isComplete: false,
};

const agentReducer = (state: AgentState, action: AgentAction): AgentState => {
  switch (action.type) {
    case 'INIT_PIPELINE':
      return {
        ...state,
        caseId: action.caseId,
        pipeline: action.pipeline,
        currentAgent: action.pipeline[0],
        agents: action.pipeline.reduce(
          (acc, id) => ({
            ...acc,
            [id]: {
              id,
              status: 'pending',
              confidence: 0,
              progress: 0,
              output: {},
              duration: 0,
              timestamp: new Date().toISOString(),
              dependencies: [],
            },
          }),
          {} as Record<AgentType, AgentNode>
        ),
        isComplete: false,
      };

    case 'AGENT_START':
      return {
        ...state,
        currentAgent: action.agent,
        agents: {
          ...state.agents,
          [action.agent]: {
            ...state.agents[action.agent],
            status: 'running',
            progress: 10,
            timestamp: new Date().toISOString(),
          },
        },
      };

    case 'AGENT_STREAM':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agent]: {
            ...state.agents[action.agent],
            status: 'streaming',
            progress: Math.min(95, state.agents[action.agent].progress + 2),
            output: {
              ...state.agents[action.agent].output,
              stream: (state.agents[action.agent].output?.stream as string || '') + action.token,
            },
          },
        },
      };

    case 'AGENT_SUCCESS':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agent]: {
            ...state.agents[action.agent],
            status: 'success',
            confidence: 0.85 + Math.random() * 0.15,
            progress: 100,
            output: action.output,
            duration: action.duration,
          },
        },
      };

    case 'AGENT_ERROR':
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.agent]: {
            ...state.agents[action.agent],
            status: 'error',
          },
        },
      };

    case 'COMPLETE_CASE':
      return {
        ...state,
        isComplete: true,
        currentAgent: null,
      };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
};

const STORAGE_PREFIX = 'agent_state_';

export function useAgentState(initialCaseId?: string) {
  const [state, dispatch] = useReducer(agentReducer, initialState);

  // Persist state to localStorage (web)
  useEffect(() => {
    if (typeof window === 'undefined' || !state.caseId) return;
    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}${state.caseId}`,
        JSON.stringify(state)
      );
    } catch {
      // Quota exceeded or private mode
    }
  }, [state.caseId, state.agents]);

  // Network mode detection (web)
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

  const startPipeline = useCallback((caseId: string, pipeline: AgentType[]) => {
    dispatch({ type: 'INIT_PIPELINE', caseId, pipeline });
  }, []);

  const nextAgent = useCallback(() => {
    if (!state.currentAgent || state.isComplete) return;
    const currentIndex = state.pipeline.indexOf(state.currentAgent);
    const next = state.pipeline[currentIndex + 1];
    if (next) {
      dispatch({ type: 'AGENT_START', agent: next });
    } else {
      dispatch({ type: 'COMPLETE_CASE' });
    }
  }, [state.currentAgent, state.isComplete, state.pipeline]);

  const updateAgent = useCallback(
    (agent: AgentType, output: Record<string, unknown>, duration: number) => {
      dispatch({ type: 'AGENT_SUCCESS', agent, output, duration });
    },
    []
  );

  const streamToken = useCallback((agent: AgentType, token: string) => {
    dispatch({ type: 'AGENT_STREAM', agent, token });
  }, []);

  const setAgentError = useCallback((agent: AgentType, error: string) => {
    dispatch({ type: 'AGENT_ERROR', agent, error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  /** Run pipeline simulation (demo) — replace with real API in production */
  const runPipelineSimulation = useCallback(
    async (plan: AgentType[], _input: string) => {
      for (const agentId of plan) {
        dispatch({ type: 'AGENT_START', agent: agentId });
        await new Promise((r) => setTimeout(r, 400));

        if (agentId === 'medgemma') {
          const tokens = [
            'Analyzing observations... ',
            'Risk stratification in progress. ',
            'Evaluating developmental domains. ',
            'Generating evidence-based recommendations.',
          ];
          for (const token of tokens) {
            dispatch({ type: 'AGENT_STREAM', agent: agentId, token });
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        dispatch({
          type: 'AGENT_SUCCESS',
          agent: agentId,
          output: { summary: `Processed by ${agentId}` },
          duration: 500 + Math.random() * 300,
        });
        await new Promise((r) => setTimeout(r, 200));
      }
      dispatch({ type: 'COMPLETE_CASE' });
    },
    []
  );

  return {
    state,
    startPipeline,
    nextAgent,
    updateAgent,
    streamToken,
    setAgentError,
    reset,
    runPipelineSimulation,
    isPipelineActive: !!state.caseId && !state.isComplete,
    readyAgents: Object.values(state.agents).filter((a) => a.status === 'success'),
    canProceed: state.currentAgent
      ? state.agents[state.currentAgent]?.status === 'success'
      : true,
  };
}
