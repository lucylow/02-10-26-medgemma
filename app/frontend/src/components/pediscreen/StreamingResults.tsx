import React, { useEffect } from 'react';
import { Brain, Shield, Activity, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useAgentStream } from '@/hooks/useAgentStream';
import type { StreamScreeningRequest } from '@/services/screeningApi';
import { cn } from '@/lib/utils';

interface StreamingResultsProps {
  request: StreamScreeningRequest;
  onComplete: (result: {
    screeningId?: string;
    inferenceId?: string;
    report?: unknown;
    feedbackAllowed?: boolean;
    feedbackUrl?: string;
  }) => void;
  onError?: (error: string) => void;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  intake: <Shield className="w-5 h-5 text-emerald-500" />,
  embedding: <Zap className="w-5 h-5 text-amber-500" />,
  temporal: <Activity className="w-5 h-5 text-violet-500" />,
  medgemma: <Brain className="w-5 h-5 text-blue-800" />,
  safety: <Shield className="w-5 h-5 text-red-500" />,
};

export function StreamingResults({ request, onComplete, onError }: StreamingResultsProps) {
  const {
    streamScreening,
    isStreaming,
    progress,
    events,
    partialResponse,
    currentAgent,
    error,
    reset,
  } = useAgentStream();

  useEffect(() => {
    reset();
    let cancelled = false;
    const run = async () => {
      const report = await streamScreening(request);
      if (!cancelled && report) {
        onComplete({
          screeningId: report.screeningId,
          inferenceId: report.inferenceId,
          report: report.report,
          feedbackAllowed: report.feedbackAllowed,
          feedbackUrl: report.feedbackUrl,
        });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [request.childAge, request.domain, request.observations]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const renderAgentIcon = (agent: string) =>
    AGENT_ICONS[agent] ?? <Activity className="w-5 h-5 text-muted-foreground" />;

  return (
    <div className="space-y-6 flex-1">
      {/* Pipeline Progress */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Live AI Analysis</h3>
        <Progress value={progress} className="h-3" />
        <p className="text-sm text-muted-foreground text-right">{Math.round(progress)}%</p>
      </div>

      {/* Live agent output */}
      {isStreaming && (
        <Card className="border-primary/20 bg-slate-50 dark:bg-slate-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              {renderAgentIcon(currentAgent ?? 'medgemma')}
              <span className="font-semibold capitalize">
                {currentAgent?.replace('_', ' ') ?? 'MedGemma'}
              </span>
            </div>
            <div
              className={cn(
                'min-h-[60px] text-sm leading-relaxed',
                !partialResponse && 'animate-pulse bg-muted/50 rounded-lg'
              )}
            >
              {partialResponse || (
                <span className="text-muted-foreground">Analyzing...</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent timeline */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Pipeline Progress</h3>
        <div className="space-y-2">
          {events
            .filter((e) => e.agent || e.type === 'status')
            .map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm opacity-90"
              >
                {event.agent && renderAgentIcon(event.agent)}
                <span className="capitalize">
                  {event.agent?.replace('_', ' ') ?? event.type}
                </span>
                <span className="text-muted-foreground">
                  {event.message ?? (event.type === 'agent_complete' ? '✓' : '')}
                </span>
              </div>
            ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
