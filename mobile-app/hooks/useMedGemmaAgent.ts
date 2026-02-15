import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAgentState } from './useAgentState';
import { MEDGEMMA_STREAM_URL } from '@/constants/api';
import { generateOfflineMedGemma } from '@/lib/offlineRules';

export type MedGemmaOutput = {
  risk: 'low' | 'monitor' | 'elevated' | 'discuss';
  confidence: number;
  summary: string[];
  rationale: string;
  milestones: string[];
  recommendations: string[];
  fhir_bundle?: unknown;
};

function buildMedGemmaPrompt(input: {
  age_months: number;
  domain: string;
  observations: string;
  prior_cases?: string[];
}): string {
  return `<bos><start_of_turn>system
You are PediScreen AI powered by MedGemma 4B-IT (pediatric fine-tune).
Provide ONLY structured JSON screening output. Never diagnose.

PATIENT: ${input.age_months} months
DOMAIN: ${input.domain}
OBSERVATIONS: ${input.observations}

CRITERIA:
- ASQ-3 validated milestones
- AAP screening guidelines 2025
- Conservative risk assessment

FORMAT (JSON only):
{
  "risk": "low|monitor|elevated|discuss",
  "confidence": 0.XX,
  "summary": ["bullet 1", "bullet 2"],
  "rationale": "Clinical reasoning...",
  "milestones": ["expected", "delayed"],
  "recommendations": ["next steps"]
}
<end_of_turn>
<start_of_turn>user
Analyze this case.<end_of_turn>
<start_of_turn>model
`;
}

function parseMedGemmaStream(text: string): MedGemmaOutput | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as MedGemmaOutput;
    return {
      risk: parsed.risk ?? 'monitor',
      confidence: parsed.confidence ?? 0.8,
      summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      rationale: parsed.rationale ?? '',
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
      fhir_bundle: parsed.fhir_bundle,
    };
  } catch {
    return null;
  }
}

export function useMedGemmaAgent(caseId: string) {
  const { streamToken, updateAgent, completeAgent, failAgent } =
    useAgentState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedOutput, setStreamedOutput] = useState('');
  const [modelStats, setModelStats] = useState({
    tokens: 0,
    speed: 0,
    temp: 0.1,
  });
  const streamedRef = useRef('');

  const executeMedGemma = useCallback(
    async (
      input: {
        age_months: number;
        domain: string;
        observations: string;
        prior_cases?: string[];
      },
      overrideCaseId?: string
    ) => {
      const storageId = overrideCaseId ?? caseId;
      setIsGenerating(true);
      streamedRef.current = '';
      setStreamedOutput('');
      setModelStats((s) => ({ ...s, tokens: 0 }));

      try {
        const response = await fetch(MEDGEMMA_STREAM_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.EXPO_PUBLIC_API_KEY
              ? { 'x-api-key': process.env.EXPO_PUBLIC_API_KEY }
              : {}),
          },
          body: JSON.stringify({
            age_months: input.age_months,
            domain: input.domain,
            observations: input.observations,
            case_id: storageId,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Stream failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let tokens = 0;
        const start = Date.now();
        let buffer = '';
        let finalOutput: MedGemmaOutput | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;

            let token = '';
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.type === 'medgemma_token' && parsed?.token) {
                token = parsed.token;
              } else if (parsed?.type === 'complete' && parsed?.report) {
                const r = parsed.report?.report ?? parsed.report;
                const riskMap: Record<string, MedGemmaOutput['risk']> = {
                  on_track: 'low',
                  low: 'low',
                  monitor: 'monitor',
                  medium: 'monitor',
                  refer: 'elevated',
                  high: 'discuss',
                };
                const rawRisk = (r?.riskLevel ?? 'monitor').toLowerCase();
                finalOutput = {
                  risk: riskMap[rawRisk] ?? 'monitor',
                  confidence: r?.confidence ?? 0.8,
                  summary: Array.isArray(r?.keyFindings)
                    ? r.keyFindings
                    : r?.summary
                    ? [r.summary]
                    : [],
                  rationale: r?.summary ?? '',
                  milestones: [],
                  recommendations: r?.recommendations ?? [],
                };
                break;
              }
            } catch {
              token = raw;
            }

            if (token) {
              streamToken('medgemma', token);
              streamedRef.current += token;
              setStreamedOutput(streamedRef.current);
              tokens++;
              setModelStats((s) => ({
                ...s,
                tokens,
                speed: tokens / ((Date.now() - start) / 1000) || 0,
              }));
            }
          }
          if (finalOutput) break;
        }

        if (!finalOutput) {
          finalOutput = parseMedGemmaStream(streamedRef.current);
        }

        if (finalOutput) {
          updateAgent('medgemma', {
            output: finalOutput,
            confidence: finalOutput.confidence,
          });
          completeAgent('medgemma', finalOutput, Date.now() - start);

        await AsyncStorage.setItem(
          `medgemma_${storageId}`,
          JSON.stringify(finalOutput)
        );
        } else {
          failAgent('medgemma');
        }
      } catch {
        const offlineResult = generateOfflineMedGemma({
          age_months: input.age_months,
          domain: input.domain,
          observations: input.observations,
        });
        updateAgent('medgemma', {
          output: offlineResult,
          status: 'offline',
        });
        completeAgent('medgemma', offlineResult, 50);
        await AsyncStorage.setItem(
          `medgemma_${storageId}`,
          JSON.stringify(offlineResult)
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [caseId, streamToken, updateAgent, completeAgent, failAgent]
  );

  const parsedOutput = parseMedGemmaStream(streamedOutput);

  return {
    executeMedGemma,
    isGenerating,
    streamedOutput,
    modelStats,
    parsedOutput,
  };
}
