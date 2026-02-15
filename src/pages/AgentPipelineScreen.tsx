import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { useAgents } from '@/contexts/AgentContext';
import { AgentNode } from '@/components/pediscreen/AgentNode';
import { ConnectionStatus } from '@/components/pediscreen/ConnectionStatus';

export default function AgentPipelineScreen() {
  const { state, dispatch } = useAgents();
  const navigate = useNavigate();

  const medgemmaAgent = state.pipeline.find((a) => a.id === 'medgemma');
  const hasStreaming = state.isStreaming && medgemmaAgent?.status === 'streaming';
  const streamText =
    (medgemmaAgent?.output?.stream as string) || medgemmaAgent?.stream || 'Streaming...';

  if (!state.currentCaseId) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain size={48} className="text-primary opacity-50" />
          </div>
          <h2 className="text-2xl font-bold text-muted-foreground text-center">
            No active pipeline
          </h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Start a new screening from the dashboard or voice input to see the AI agent pipeline in
            action.
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
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* CASE HEADER */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-2">
            AI Agent Pipeline Active
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <span className="text-muted-foreground">
              Case #{state.currentCaseId.slice(-6)} • {state.priority.toUpperCase()} Priority
            </span>
            <ConnectionStatus isConnected={state.mode === 'online'} />
          </div>
        </div>

        {/* AGENT PIPELINE TRACKER */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Agent Pipeline Active</h3>
          <div className="flex flex-wrap gap-4 justify-center px-4">
            {state.pipeline.map((agent, index) => (
              <AgentNode
                key={agent.id}
                agent={agent.id}
                status={agent.status}
                position={index + 1}
                total={state.pipeline.length}
                mode={state.mode}
              />
            ))}
          </div>
        </div>

        {/* LIVE STREAMING OUTPUT */}
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

        {/* PROGRESS OVERVIEW — show when pipeline complete */}
        {!state.isStreaming && state.pipeline.some((a) => a.status === 'success') && (
          <Card className="bg-emerald-50/50 border-emerald-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-emerald-800">
                Pipeline complete. All agents finished successfully.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ACTIONS */}
        <div className="flex flex-wrap justify-center gap-3">
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
    </div>
  );
}
