/**
 * Agent Swarm Store — 12-Agent Medical Swarm Intelligence
 * Shared memory, task delegation, conflict resolution, clinician override.
 * @see docs/CURSOR_PROMPT_SPECIALIZED_MULTI_AI_AGENTS.md
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type AgentStatus = 'idle' | 'thinking' | 'complete' | 'error';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  confidence: number;
  output: unknown;
  memory: unknown[];
  tasks: string[];
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

export const AGENT_IDS = [
  'triage',
  'rop',
  'growth',
  'audio',
  'asq',
  'immunization',
  'evidence',
  'safety',
  'referral',
  'chw',
  'audit',
  'orchestrator',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

const DEFAULT_AGENTS: Record<AgentId, Agent> = {
  triage: {
    id: 'triage',
    name: 'TriageAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  rop: {
    id: 'rop',
    name: 'ROPVisionAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  growth: {
    id: 'growth',
    name: 'GrowthAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  audio: {
    id: 'audio',
    name: 'AudioAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  asq: {
    id: 'asq',
    name: 'ASQAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  immunization: {
    id: 'immunization',
    name: 'ImmunizationAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  evidence: {
    id: 'evidence',
    name: 'EvidenceAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  safety: {
    id: 'safety',
    name: 'SafetyAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  referral: {
    id: 'referral',
    name: 'ReferralAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  chw: {
    id: 'chw',
    name: 'CHWAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  audit: {
    id: 'audit',
    name: 'AuditAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
  orchestrator: {
    id: 'orchestrator',
    name: 'OrchestratorAgent',
    status: 'idle',
    confidence: 0,
    output: null,
    memory: [],
    tasks: [],
  },
};

export interface AgentSwarmState {
  agents: Record<AgentId, Agent>;
  sharedMemory: unknown[];
  episodeMemory: unknown[];
  activePatient: string | null;
  taskQueue: string[];
  agentMessages: AgentMessage[];

  activateAgent: (agentId: AgentId) => void;
  updateAgentStatus: (
    agentId: AgentId,
    status: AgentStatus,
    output?: unknown
  ) => void;
  delegateTask: (fromAgent: string, toAgent: AgentId, task: string) => void;
  addSharedMemory: (memory: unknown) => void;
  startScreeningSession: (patientId: string) => void;
  resolveConflicts: (votes: Record<string, string>) => string;
  resetSwarm: () => void;
}

const initialState = {
  agents: { ...DEFAULT_AGENTS },
  sharedMemory: [] as unknown[],
  episodeMemory: [] as unknown[],
  activePatient: null as string | null,
  taskQueue: [] as string[],
  agentMessages: [] as AgentMessage[],
};

function resetAgents(): Record<AgentId, Agent> {
  return AGENT_IDS.reduce(
    (acc, id) => ({
      ...acc,
      [id]: { ...DEFAULT_AGENTS[id], status: 'idle', output: null, tasks: [] },
    }),
    {} as Record<AgentId, Agent>
  );
}

export const useAgentSwarm = create<AgentSwarmState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        activateAgent: (agentId) =>
          set((state) => ({
            agents: {
              ...state.agents,
              [agentId]: { ...state.agents[agentId], status: 'thinking' },
            },
          })),

        updateAgentStatus: (agentId, status, output) =>
          set((state) => ({
            agents: {
              ...state.agents,
              [agentId]: {
                ...state.agents[agentId],
                status,
                confidence:
                  output != null && typeof output === 'object' && 'confidence' in output
                    ? Number((output as { confidence?: number }).confidence) || 0
                    : state.agents[agentId].confidence,
                output: output ?? null,
              },
            },
          })),

        delegateTask: (fromAgent, toAgent, task) => {
          const message: AgentMessage = {
            from: fromAgent,
            to: toAgent,
            content: task,
            timestamp: Date.now(),
          };
          set((state) => ({
            agentMessages: [...state.agentMessages, message],
            agents: {
              ...state.agents,
              [toAgent]: {
                ...state.agents[toAgent],
                tasks: [...state.agents[toAgent].tasks, task],
              },
            },
          }));
        },

        addSharedMemory: (memory) =>
          set((state) => ({
            sharedMemory: [...state.sharedMemory, memory],
            episodeMemory: [...state.episodeMemory, memory],
          })),

        startScreeningSession: (patientId) =>
          set({
            activePatient: patientId,
            episodeMemory: [],
          }),

        resolveConflicts: (votes) => {
          const { agents } = get();
          const weighted: Record<string, number> = {};
          for (const [agentId, decision] of Object.entries(votes)) {
            const confidence =
              agents[agentId as AgentId]?.confidence ?? 0.5;
            weighted[decision] = (weighted[decision] ?? 0) + confidence;
          }
          const winner = Object.entries(weighted).reduce((a, b) =>
            a[1] > b[1] ? a : b
          );
          return winner[0];
        },

        resetSwarm: () =>
          set({
            ...initialState,
            agents: resetAgents(),
          }),
      }),
      { name: 'pediscreen-agent-swarm' }
    ),
    { name: 'AgentSwarm' }
  )
);
