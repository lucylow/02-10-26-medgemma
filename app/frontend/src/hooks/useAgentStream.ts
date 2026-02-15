import { useState, useCallback } from 'react';
import {
  streamScreening,
  type StreamEvent,
  type StreamScreeningRequest,
  type ScreeningResult,
} from '@/services/screeningApi';

export interface UseAgentStreamReturn {
  streamScreening: (request: StreamScreeningRequest) => Promise<ScreeningResult | null>;
  isStreaming: boolean;
  progress: number;
  events: StreamEvent[];
  partialResponse: string;
  currentAgent: string | undefined;
  error: string | null;
  reset: () => void;
}

/**
 * Hook for real-time streaming of PediScreen AI agent pipeline.
 * Token-by-token MedGemma output with full pipeline transparency.
 */
export function useAgentStream(): UseAgentStreamReturn {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [partialResponse, setPartialResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async (request: StreamScreeningRequest) => {
    setEvents([]);
    setProgress(0);
    setPartialResponse('');
    setError(null);
    setIsStreaming(true);

    try {
      const report = await streamScreening(request, (data) => {
        setEvents((prev) => [...prev, data]);

        switch (data.type) {
          case 'status':
          case 'agent_start':
            setProgress(data.progress ?? 0);
            break;
          case 'agent_complete':
            setProgress(data.progress ?? progress);
            break;
          case 'medgemma_token':
            setPartialResponse((prev) => prev + (data.token ?? ''));
            break;
          case 'complete':
            setProgress(100);
            setIsStreaming(false);
            break;
          case 'error':
            setError(data.message ?? 'Stream error');
            setIsStreaming(false);
            break;
        }
      });

      setIsStreaming(false);
      return report;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed');
      setIsStreaming(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setProgress(0);
    setPartialResponse('');
    setError(null);
    setIsStreaming(false);
  }, []);

  const currentAgent = events.filter((e) => e.agent).slice(-1)[0]?.agent;

  return {
    streamScreening: startStream,
    isStreaming,
    progress,
    events,
    partialResponse,
    currentAgent,
    error,
    reset,
  };
}
