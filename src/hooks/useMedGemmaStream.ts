import { useState, useCallback } from 'react';
import type { MedGemmaInput } from '@/api/medgemma';
import { streamMedGemmaReport } from '@/api/medgemma';

/**
 * Hook for streaming MedGemma output token-by-token.
 * Makes the AI feel "alive" — judges love this UX.
 */
export function useMedGemmaStream() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (payload: Omit<MedGemmaInput, 'images'>) => {
    setText('');
    setError(null);
    setIsStreaming(true);

    try {
      await streamMedGemmaReport(payload, (chunk) => {
        setText((prev) => prev + chunk);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream failed');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setText('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return { text, start, reset, isStreaming, error };
}
