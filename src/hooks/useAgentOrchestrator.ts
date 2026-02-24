/**
 * useAgentOrchestrator — Composite orchestration hook for PediScreen AI
 * Input → useSmartRouter → useAgentPipeline → useAgentStream → useAgentCache
 * When online and embedding_b64 or VITE_ORCHESTRATE_URL is set, calls backend infer/orchestrate.
 */

import { useCallback } from 'react';
import { useAgentState } from './useAgentState';
import { useSmartRouting } from './useSmartRouting';
import { useAgentStream } from './useAgentStream';
import { useOfflineAgents } from './useOfflineAgents';
import { useAgentCache } from './useAgentCache';
import type { OfflineResponse } from './useOfflineAgents';
import { inferWithEmbedding, orchestrateCase } from '@/api/medgemma';

export type OrchestrateOptions = {
  embedding_b64?: string;
  shape?: number[];
  apiKey?: string;
  consent_id?: string;
  user_id_pseudonym?: string;
};

export type OrchestrateResult = {
  routing: Awaited<ReturnType<ReturnType<typeof useSmartRouting>['executeRouting']>>;
  offlineResult: Awaited<ReturnType<ReturnType<typeof useOfflineAgents>['generateOffline']>>;
  caseId: string;
  isStreaming: boolean;
  streamReady: boolean;
  backendResult?: { summary?: string; risk?: string; recommendations?: string[]; confidence?: number };
};

export type OrchestrateError = {
  message: string;
  code?: string;
  source?: 'routing' | 'pipeline' | 'offline' | 'backend' | 'unknown';
};

const ORCHESTRATE_URL = import.meta.env.VITE_ORCHESTRATE_URL;

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
    async (
      input: string,
      age: number,
      options?: OrchestrateOptions
    ): Promise<OrchestrateResult> => {
      const caseIdNew = `case_${Date.now()}`;
      const apiKey = options?.apiKey ?? import.meta.env.VITE_API_KEY;

      try {
        const routing = await smartRouting.executeRouting(input, age);
        agentState.startPipeline(caseIdNew, routing.fullPipeline);

        const hasBackend =
          agentState.state.mode === 'online' &&
          (options?.embedding_b64 || ORCHESTRATE_URL);

        if (hasBackend) {
          const runBackend = async (): Promise<OrchestrateResult['backendResult']> => {
            try {
              if (ORCHESTRATE_URL && apiKey) {
                const res = await orchestrateCase(
                  {
                    case_id: caseIdNew,
                    age_months: age,
                    observations: input,
                    embedding_b64: options?.embedding_b64,
                    shape: options?.shape,
                    consent_id: options?.consent_id,
                    user_id_pseudonym: options?.user_id_pseudonym,
                  },
                  apiKey
                );
                const out = res.output as { summary?: string; risk?: string; recommendations?: string[] } | undefined;
                if (out && routing.fullPipeline.includes('medgemma')) {
                  agentState.updateAgent(
                    'medgemma',
                    {
                      summary: out.summary ?? '',
                      risk: out.risk,
                      recommendations: out.recommendations ?? [],
                      provenance: res.provenance,
                    },
                    (res.inference_time_ms as number) ?? 0
                  );
                }
                return { summary: out?.summary, risk: out?.risk, recommendations: out?.recommendations };
              }
              if (options?.embedding_b64) {
                const res = await inferWithEmbedding({
                  case_id: caseIdNew,
                  age_months: age,
                  observations: input,
                  embedding_b64: options.embedding_b64,
                  shape: options.shape,
                  consent_id: options.consent_id,
                  user_id_pseudonym: options.user_id_pseudonym,
                  apiKey,
                });
                const out = res.result;
                if (out && routing.fullPipeline.includes('medgemma')) {
                  const summaryStr = typeof out.summary === 'string' ? out.summary : (out.summary as string[]).join(' ');
                  agentState.updateAgent(
                    'medgemma',
                    {
                      summary: summaryStr,
                      risk: out.risk,
                      recommendations: out.recommendations ?? [],
                      confidence: out.confidence,
                      provenance: res.provenance,
                    },
                    res.inference_time_ms ?? 0
                  );
                }
                return {
                  summary: typeof res.result.summary === 'string' ? res.result.summary : (res.result.summary as string[]).join(' '),
                  risk: res.result.risk,
                  recommendations: res.result.recommendations,
                  confidence: res.result.confidence,
                };
              }
            } catch (err) {
              console.warn('Backend infer/orchestrate failed, using simulation', err);
            }
            return undefined;
          };
          agentState.runPipelineSimulation(routing.fullPipeline, input);
          const backendResult = await runBackend();
          const offlineResult = await offlineAgents.generateOffline(input, age);
          return {
            routing,
            offlineResult,
            caseId: caseIdNew,
            isStreaming: false,
            streamReady: true,
            backendResult: backendResult ?? undefined,
          };
        }

        agentState.runPipelineSimulation(routing.fullPipeline, input);
        const offlineResult = await offlineAgents.generateOffline(input, age);

        return {
          routing,
          offlineResult,
          caseId: caseIdNew,
          isStreaming: agentState.state.mode === 'online',
          streamReady: agentState.state.mode === 'online',
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = err && typeof (err as { code?: string }).code === 'string' ? (err as { code: string }).code : undefined;
        const firstAgent = agentState.state.pipeline[0];
        if (firstAgent) {
          agentState.setAgentError(firstAgent, message);
        }
        throw { message, code, source: 'pipeline' as const } satisfies OrchestrateError;
      }
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
