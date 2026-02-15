/**
 * Voice input component for PediScreen observations.
 * Uses AssemblyAI for streaming transcription with medical terminology enhancement.
 * Falls back to Web Speech API when AssemblyAI key is not configured.
 */

import React, { useEffect } from 'react';
import { Mic, StopCircle, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAssemblyAI } from '@/lib/voice/assemblyai';
import { suggestDomainFromTranscript } from '@/lib/voice/medical-enhancer';
import { cn } from '@/lib/utils';

export interface VoiceInputProps {
  apiKey: string;
  onTranscript?: (text: string) => void;
  onRecordingComplete?: (text: string) => void;
  onDomainHint?: (domain: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  apiKey,
  onTranscript,
  onRecordingComplete,
  onDomainHint,
  disabled = false,
  className,
}) => {
  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    isProcessing,
    error,
  } = useAssemblyAI({
    apiKey: apiKey ?? '',
    onFinalTranscript: (text) => {
      const domain = suggestDomainFromTranscript(text);
      onDomainHint?.(domain ?? null);
    },
    autoSubmitThreshold: 0.8,
  });

  // Sync full transcript to parent (accumulated text from streaming)
  useEffect(() => {
    if (transcript.text && onTranscript) {
      onTranscript(transcript.text);
    }
  }, [transcript.text, onTranscript]);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript.text.trim()) {
        onRecordingComplete?.(transcript.text);
      }
    } else {
      startListening();
    }
  };

  const hasAssemblyAI = !!apiKey?.trim();

  if (!hasAssemblyAI) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Voice Button */}
      <div className="flex flex-col items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn(
            'min-h-[120px] min-w-[120px] rounded-full transition-all',
            isListening && 'border-destructive bg-destructive/10 animate-pulse'
          )}
          onClick={handleToggle}
          disabled={disabled || isProcessing}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? (
            <StopCircle className="h-14 w-14 text-destructive" />
          ) : (
            <Mic className="h-14 w-14 text-primary" />
          )}
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {isListening ? 'Recording... Click to stop' : 'Tap to speak'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-2">
          {error}
        </p>
      )}

      {/* Live Transcript */}
      {transcript.text && (
        <div className="space-y-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Live: {Math.round(transcript.confidence * 100)}% confidence
            </span>
          </div>
          <p
            className="text-sm text-foreground leading-relaxed select-text"
            dir="auto"
          >
            {transcript.text}
          </p>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            AI agents analyzing...
          </span>
        </div>
      )}
    </div>
  );
};
