/**
 * useAgentOrchestrator — Composite orchestration hook for PediScreen AI
 * Input → useSmartRouter → useAgentPipeline → useAgentStream → useAgentCache
 */

import { useCallback, useMemo } from 'react';
import { useAgentState } from './useAgentState';
import { useSmartRouting } from './useSmartRouting';
import { useAgentStream } from './useAgentStream';
import { useOfflineAgents } from './useOfflineAgents';
import { useAgentCache } from './useAgentCache';
import type { OfflineResponse } from './useOfflineAgents';

export function useAgentOrchestrator(initialInput = '', initialAge = 24) {
  const agentState = useAgentState();
  const smartRouting = useSmartRouting(initialInput, initialAge);
  const offlineAgents = useOfflineAgents(initialInput, initialAge, 'language');

  const streamToken = agentState.streamToken;
  const streaming = useAgentStream('medgemma', {
    onToken: useCallback(
      (agent, token) => streamToken(agent, token),
      [streamToken]
    ),
  });

  const caseId = agentState.state.caseId ?? '';
  const agentCache = useAgentCache(caseId);

  const orchestrate = useCallback(
    async (input: string, age: number) => {
      const caseIdNew = `case_${Date.now()}`;

      // 1. Smart routing decision (with override for dynamic input/age)
      const routing = await smartRouting.executeRouting(input, age);

      // 2. Initialize pipeline
      agentState.startPipeline(caseIdNew, routing.fullPipeline);

      // 2b. Run pipeline simulation (demo — replace with real API in production)
      agentState.runPipelineSimulation(routing.fullPipeline, input);

      // 3. Offline optimistic update (use passed input/age)
      const offlineResult = await offlineAgents.generateOffline(input, age);

      // 4. Start streaming for online agents (when backend supports it)
      if (agentState.state.mode === 'online') {
        // Caller can trigger startStream with full payload
        // Here we just signal readiness — actual stream starts when MedGemma runs
        return {
          routing,
          offlineResult,
          caseId: caseIdNew,
          isStreaming: false,
          streamReady: true,
        };
      }

      return {
        routing,
        offlineResult,
        caseId: caseIdNew,
        isStreaming: false,
        streamReady: false,
      };
    },
    [
      smartRouting,
      agentState,
      offlineAgents,
    ]
  );

  return {
    // State
    state: agentState.state,
    mode: agentState.state.mode,

    // Actions
    orchestrate,
    nextAgent: agentState.nextAgent,
    reset: agentState.reset,
    startPipeline: agentState.startPipeline,

    // Streaming
    streamBuffer: streaming.streamBuffer,
    isStreaming: streaming.isStreaming,
    startStream: streaming.startStream,
    stopStream: streaming.stopStream,

    // Offline
    offlineResponse: offlineAgents.response as OfflineResponse | null,
    upgradeOnline: offlineAgents.upgradeOnline,

    // Cache
    caseHistory: agentCache.caseHistory.data,

    // Routing
    routeDecision: smartRouting.decision,
    analyzing: smartRouting.analyzing,
  };
}
