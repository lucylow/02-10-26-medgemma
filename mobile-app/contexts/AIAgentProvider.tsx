/**
 * AI Agent Provider - Production multi-agent orchestration context.
 * Wraps useAgentOrchestrator with smart routing, HITL triggers, and mode detection.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';
import { useAgentState } from '@/hooks/useAgentState';
import type { AgentType } from '@/hooks/useAgentState';

export type AgentStatus =
  | 'pending'
  | 'running'
  | 'streaming'
  | 'success'
  | 'error'
  | 'offline';

export interface AIState {
  caseId: string | null;
  pipeline: AgentType[];
  agents: Array<{
    id: AgentType;
    status: AgentStatus;
    confidence: number;
    output: Record<string, unknown>;
    duration: number;
    stream?: string;
  }>;
  hitlRequired: boolean;
  mode: 'online' | 'hybrid' | 'offline';
  isStreaming: boolean;
}

interface AIContextValue {
  state: AIState;
  startPipeline: (input: {
    age: number;
    observations: string;
    domain?: string;
    voiceTranscript?: string;
  }) => Promise<string>;
  startPipelineForChat: (input: {
    age: number;
    observations: string;
    domain?: string;
    voiceTranscript?: string;
  }) => Promise<{ risk?: string; confidence?: number; summary?: string[]; rationale?: string; recommendations?: string[] } | null>;
  triggerHitl: (agent: AgentType, output: Record<string, unknown>) => void;
  resetPipeline: () => void;
}

const AIContext = createContext<AIContextValue | null>(null);

function smartAgentRouting(observations: string): AgentType[] {
  const urgent = /emergency|seizure|breathing|choking|unresponsive/i.test(observations);
  const screening = /words|says|walk|eye|point|stack|talk|name/i.test(observations);

  if (urgent) return ['intake', 'medgemma', 'safety'];
  if (screening) return ['intake', 'embedding', 'medgemma', 'safety', 'summarizer'];
  return ['intake', 'embedding', 'medgemma', 'safety', 'summarizer'];
}

export function AIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const netInfo = useNetInfo();
  const orchestrator = useAgentOrchestrator();
  const agentState = useAgentState();

  useEffect(() => {
    const mode = netInfo.isConnected === false ? 'offline' : 'online';
    agentState.setMode(mode);
  }, [netInfo.isConnected]);

  const startPipeline = async (input: {
    age: number;
    observations: string;
    domain?: string;
    voiceTranscript?: string;
  }): Promise<string> => {
    const caseId = await orchestrator.startFullPipeline({
      age: input.age,
      observations: input.observations,
      voiceTranscript: input.voiceTranscript,
    });
    router.push(`/medgemma/${caseId}`);
    return caseId;
  };

  /** Start pipeline without navigating - returns medgemma output for chat UI */
  const startPipelineForChat = async (input: {
    age: number;
    observations: string;
    domain?: string;
    voiceTranscript?: string;
  }): Promise<{ risk?: string; confidence?: number; summary?: string[]; rationale?: string; recommendations?: string[] } | null> => {
    await orchestrator.startFullPipeline({
      age: input.age,
      observations: input.observations,
      voiceTranscript: input.voiceTranscript,
    });
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 60000);
      const unsub = useAgentState.subscribe((state) => {
        const m = state.pipeline.find((a) => a.id === 'medgemma');
        if (m?.status === 'success') {
          clearTimeout(timeout);
          unsub();
          resolve(m.output as Record<string, unknown>);
        } else if (m?.status === 'failed') {
          clearTimeout(timeout);
          unsub();
          resolve(null);
        }
      });
    });
  };

  const triggerHitl = (agent: AgentType, output: Record<string, unknown>) => {
    const confidence = (output.confidence as number) ?? 0;
    const risk = (output.risk as string) ?? '';
    const needsReview =
      confidence < 0.85 ||
      risk === 'elevated' ||
      risk === 'discuss';
    if (needsReview) {
      router.push(`/(tabs)/review`);
    }
  };

  const state: AIState = {
    caseId: orchestrator.state.currentCaseId,
    pipeline: orchestrator.state.routePlan,
    agents: orchestrator.state.pipeline.map((a) => ({
      id: a.id,
      status: a.status as AgentStatus,
      confidence: a.confidence,
      output: a.output,
      duration: a.duration,
      stream: a.stream,
    })),
    hitlRequired: false,
    mode: orchestrator.state.mode,
    isStreaming: orchestrator.state.isStreaming,
  };

  return (
    <AIContext.Provider
      value={{
        state,
        startPipeline,
        startPipelineForChat,
        triggerHitl,
        resetPipeline: orchestrator.resetPipeline,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) {
    throw new Error('useAI must be used within AIProvider');
  }
  return ctx;
}
