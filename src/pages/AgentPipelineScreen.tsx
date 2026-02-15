import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Shield, Clock, Zap, Target } from 'lucide-react';
import { useAgents } from '@/contexts/AgentContext';
import { cn } from '@/lib/utils';

const agentIcons: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  intake: Shield,
  medgemma: Brain,
  temporal: Clock,
  embedding: Zap,
  safety: Shield,
  summarizer: Target,
};

const statusColors: Record<string, string> = {
  pending: 'bg-slate-200',
  running: 'bg-amber-400',
  streaming: 'bg-blue-500',
  success: 'bg-emerald-500',
  failed: 'bg-red-500',
};

const statusTextColors: Record<string, string> = {
  pending: 'text-slate-600',
  running: 'text-amber-800',
  streaming: 'text-blue-900',
  success: 'text-emerald-900',
  failed: 'text-red-900',
};

export default function AgentPipelineScreen() {
  const { state, dispatch } = useAgents();
  const navigate = useNavigate();

  const renderAgentCard = (agent: { id: string; status: string; confidence: number; output?: Record<string, unknown> }, index: number) => {
    const Icon = agentIcons[agent.id] ?? Brain;
    const bgClass = statusColors[agent.status] ?? statusColors.pending;
    const textClass = statusTextColors[agent.status] ?? statusTextColors.pending;

    return (
      <Card
        key={agent.id}
        className={cn(
          'flex-1 min-w-[140px] max-w-[200px] transition-all duration-200 hover:scale-[0.98] hover:shadow-lg',
          bgClass,
          'border-0 text-white shadow-md'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Icon size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm uppercase tracking-wide truncate">
                {agent.id.replace('_', ' ')}
              </p>
              <p className="text-xs opacity-90 uppercase">{agent.status}</p>
              {agent.confidence > 0 && (
                <p className="text-xs opacity-90">
                  {Math.round(agent.confidence * 100)}% confidence
                </p>
              )}
            </div>
            {agent.status === 'running' && (
              <Progress value={70} className="h-1.5 w-12 shrink-0 [&>div]:bg-white/80" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const medgemmaAgent = state.pipeline.find((a) => a.id === 'medgemma');
  const hasStreaming = state.isStreaming && medgemmaAgent?.status === 'streaming';
  const streamText = (medgemmaAgent?.output?.stream as string) || 'Streaming...';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {state.currentCaseId ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-2">
              AI Agent Pipeline Active
            </h2>
            <p className="text-muted-foreground">
              Case #{state.currentCaseId.slice(-6)} • {state.priority.toUpperCase()} Priority
            </p>
          </div>

          {/* Pipeline Visualization */}
          <div className="flex flex-wrap gap-3 justify-center">
            {state.pipeline.map((agent, index) => renderAgentCard(agent, index))}
          </div>

          {/* Live Streaming Output */}
          {hasStreaming && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={20} className="text-primary" />
                  <span className="font-semibold">MedGemma Live Output</span>
                </div>
                <p className="text-foreground leading-relaxed">{streamText}</p>
              </CardContent>
            </Card>
          )}

          {/* Reset / New Screening */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'RESET_PIPELINE' })}
              className="rounded-xl"
            >
              Reset Pipeline
            </Button>
            <Button
              onClick={() => {
                dispatch({ type: 'RESET_PIPELINE' });
                navigate('/pediscreen/screening');
              }}
              className="rounded-xl bg-primary"
            >
              New Screening
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain size={48} className="text-primary opacity-50" />
          </div>
          <h2 className="text-2xl font-bold text-muted-foreground text-center">
            No active pipeline
          </h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Start a new screening from the dashboard or voice input to see the AI agent pipeline in action.
          </p>
          <Button
            onClick={() => navigate('/pediscreen/dashboard')}
            className="rounded-xl bg-primary text-primary-foreground gap-2"
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/pediscreen/screening')}
            className="rounded-xl"
          >
            Start New Screening
          </Button>
        </div>
      )}
    </div>
  );
}
