import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

export type AgentType = 'intake' | 'medgemma' | 'temporal' | 'embedding' | 'safety' | 'summarizer';
export type AgentStatus = 'pending' | 'running' | 'streaming' | 'success' | 'failed';

export interface Agent {
  id: AgentType;
  status: AgentStatus;
  confidence: number;
  output: Record<string, unknown>;
  duration: number;
  timestamp: string;
}

export interface AgentState {
  currentCaseId: string | null;
  pipeline: Agent[];
  routePlan: AgentType[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isStreaming: boolean;
}

export type AgentAction =
  | { type: 'START_PIPELINE'; caseId: string; plan: AgentType[] }
  | { type: 'AGENT_START'; agentId: AgentType }
  | { type: 'AGENT_STREAMING'; agentId: AgentType; token: string }
  | { type: 'AGENT_PROGRESS'; agentId: AgentType; progress: number }
  | { type: 'AGENT_COMPLETE'; agentId: AgentType; output: Record<string, unknown>; duration: number }
  | { type: 'AGENT_ERROR'; agentId: AgentType; error: string }
  | { type: 'RESET_PIPELINE' };

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
        })),
        routePlan: action.plan,
        priority: 'medium',
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
          agent.id === 'medgemma'
            ? {
                ...agent,
                output: { ...agent.output, stream: action.token },
                status: 'streaming' as AgentStatus,
              }
            : agent
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
      return initialState;

    default:
      return state;
  }
};

/** Smart input classification: maps observations + age to agent pipeline plan */
async function classifyInputToAgentPlan(input: string, age: number): Promise<AgentType[]> {
  const urgentKeywords = ['emergency', 'seizure', 'not breathing', 'unresponsive'];
  const screeningKeywords = ['says', 'words', 'walking', 'eye contact', 'playing'];

  const hasUrgent = urgentKeywords.some((kw) => input.toLowerCase().includes(kw));
  const hasScreening = screeningKeywords.some((kw) => input.toLowerCase().includes(kw));

  if (hasUrgent) {
    return ['intake', 'safety'];
  }

  if (hasScreening) {
    return ['intake', 'embedding', 'temporal', 'medgemma', 'safety', 'summarizer'];
  }

  return ['intake', 'medgemma', 'safety'];
}

/** Simulate pipeline execution for demo; replace with real API calls in production */
async function runPipelineSimulation(
  dispatch: React.Dispatch<AgentAction>,
  plan: AgentType[],
  input: string
) {
  for (const agentId of plan) {
    dispatch({ type: 'AGENT_START', agentId });
    await new Promise((r) => setTimeout(r, 400));

    if (agentId === 'medgemma') {
      dispatch({ type: 'AGENT_STREAMING', agentId, token: 'Analyzing observations... ' });
      await new Promise((r) => setTimeout(r, 300));
      dispatch({
        type: 'AGENT_STREAMING',
        agentId,
        token: 'Analyzing observations... Risk stratification in progress.',
      });
      await new Promise((r) => setTimeout(r, 400));
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

  const startPipeline = useCallback(async (input: string, age: number) => {
    const caseId = `case-${Date.now()}`;
    const smartPlan = await classifyInputToAgentPlan(input, age);
    dispatch({ type: 'START_PIPELINE', caseId, plan: smartPlan });
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
