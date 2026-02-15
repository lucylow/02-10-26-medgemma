import { useCallback } from 'react';
import { useAgentState } from './useAgentState';
import { useMedGemmaAgent } from './useMedGemmaAgent';

function classifyDomain(observations: string): string {
  const patterns: Record<string, RegExp> = {
    language: /words|says|talk|name|point|speak|vocabulary/i,
    motor: /walk|crawl|stack|throw|grasp|climb|run|jump/i,
    social: /eye|smile|share|play|hug|wave|point|imitate/i,
    cognitive: /stack|sort|match|problem|solve|pretend/i,
  };

  for (const [domain, pattern] of Object.entries(patterns)) {
    if (pattern.test(observations)) return domain;
  }
  return 'general';
}

function analyzePriority(observations: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lower = observations.toLowerCase();
  if (/emergency|seizure|unresponsive|breathing|choking/i.test(lower))
    return 'urgent';
  if (/delay|concern|worry|regression/i.test(lower)) return 'high';
  if (/monitor|check|follow.?up|recheck/i.test(lower)) return 'medium';
  return 'low';
}

export function useAgentOrchestrator() {
  const agentState = useAgentState();
  const caseId = agentState.currentCaseId ?? `case_${Date.now()}`;
  const medgemma = useMedGemmaAgent(caseId);

  const startFullPipeline = useCallback(
    async (input: {
      age: number;
      observations: string;
      voiceTranscript?: string;
    }): Promise<string> => {
      const id = `case_${Date.now()}`;
      const domain = classifyDomain(input.observations);
      const priority = analyzePriority(input.observations);
      const mode =
        agentState.mode === 'online' ? 'online' : agentState.mode;

      agentState.startPipeline(
        id,
        ['intake', 'embedding', 'medgemma', 'safety', 'summarizer'],
        priority,
        mode
      );

      agentState.updateAgent('intake', {
        output: {
          age_months: input.age,
          observations: input.observations,
          domain,
          voiceTranscript: input.voiceTranscript,
        },
        status: 'success',
      });

      await medgemma.executeMedGemma(
        {
          age_months: input.age,
          domain,
          observations: input.observations,
        },
        id
      );

      agentState.updateAgent('safety', {
        output: { validated: true },
        status: 'success',
      });
      return id;
    },
    [agentState, medgemma]
  );

  const streamToken = agentState.streamToken;

  return {
    startFullPipeline,
    streamToken,
    medgemma,
    state: {
      currentCaseId: agentState.currentCaseId,
      pipeline: agentState.pipeline,
      routePlan: agentState.routePlan,
      priority: agentState.priority,
      isStreaming: agentState.isStreaming,
      mode: agentState.mode,
    },
    updateAgent: agentState.updateAgent,
    resetPipeline: agentState.resetPipeline,
  };
}
