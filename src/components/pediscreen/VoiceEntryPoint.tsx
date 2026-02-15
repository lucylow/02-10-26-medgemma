/**
 * VoiceEntryPoint — Speak observations → Smart routing → Pipeline
 */

import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/voice/VoiceInput';
import { useAgents } from '@/contexts/AgentContext';
import { cn } from '@/lib/utils';

const ASSEMBLY_AI_KEY = import.meta.env.VITE_ASSEMBLYAI_API_KEY ?? '';

export interface VoiceEntryPointProps {
  defaultAge?: number;
  onPipelineStart?: () => void;
  className?: string;
}

export function VoiceEntryPoint({
  defaultAge = 24,
  onPipelineStart,
  className,
}: VoiceEntryPointProps) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const { startPipeline } = useAgents();

  const handleVoiceInput = async (transcript: string) => {
    setLiveTranscript(transcript);
    await startPipeline(transcript, defaultAge);
    onPipelineStart?.();
  };

  return (
    <Card
      className={cn(
        'border-sky-200/50 bg-sky-50/80 shadow-sm',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <Mic
            size={48}
            className={cn(
              'text-sky-500 transition-opacity',
              isListening ? 'opacity-100' : 'opacity-70'
            )}
          />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-sky-900">
              Speak Your Observations
            </h3>
            <p className="text-sm text-slate-600">
              &quot;My 24-month-old says 10 words and ignores their name&quot;
            </p>
          </div>

          {ASSEMBLY_AI_KEY ? (
            <VoiceInput
              apiKey={ASSEMBLY_AI_KEY}
              onTranscript={setLiveTranscript}
              onRecordingComplete={handleVoiceInput}
              disabled={false}
            />
          ) : (
            <div className="space-y-3 w-full max-w-sm">
              <p className="text-xs text-slate-500 text-center">
                Add VITE_ASSEMBLYAI_API_KEY for voice input. Or use text below.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const sample = 'Says 10 words, ignores name when called';
                  setLiveTranscript(sample);
                  startPipeline(sample, defaultAge);
                  onPipelineStart?.();
                }}
              >
                <Mic size={20} className="mr-2" />
                Quick Screen (Sample)
              </Button>
            </div>
          )}

          {liveTranscript && (
            <div className="w-full p-3 rounded-lg bg-sky-100/80 border border-sky-200/50">
              <p className="text-xs font-medium text-sky-800 mb-1">Transcript</p>
              <p className="text-sm text-slate-700">{liveTranscript}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
