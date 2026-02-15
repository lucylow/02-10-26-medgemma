/**
 * AgentOrchestratorContext — Provides useAgentOrchestrator state app-wide
 * Use useAgentOrchestratorContext() for full API (offlineResponse, upgradeOnline, etc.)
 * AgentProvider provides this alongside the AgentContext adapter
 */

import React, { createContext, useContext } from 'react';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';

export type AgentOrchestratorValue = ReturnType<typeof useAgentOrchestrator>;

export const AgentOrchestratorContext = createContext<AgentOrchestratorValue | null>(null);

export function AgentOrchestratorProvider({
  children,
  initialInput = '',
  initialAge = 24,
}: {
  children: React.ReactNode;
  initialInput?: string;
  initialAge?: number;
}) {
  const orchestrator = useAgentOrchestrator(initialInput, initialAge);
  return (
    <AgentOrchestratorContext.Provider value={orchestrator}>
      {children}
    </AgentOrchestratorContext.Provider>
  );
}

export function useAgentOrchestratorContext() {
  const ctx = useContext(AgentOrchestratorContext);
  if (!ctx) {
    return null;
  }
  return ctx;
}
