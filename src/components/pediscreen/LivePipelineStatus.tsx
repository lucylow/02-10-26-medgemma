/**
 * LivePipelineStatus — Compact pipeline preview for dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/contexts/AgentContext';
import { AgentNode } from './AgentNode';

export function LivePipelineStatus() {
  const { state } = useAgents();
  const navigate = useNavigate();

  if (!state.currentCaseId) {
    return (
      <Card className="border-dashed border-2 bg-slate-50/50">
        <CardContent className="py-8 text-center">
          <Brain size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-3">No active pipeline</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pediscreen/screening')}
            className="rounded-xl"
          >
            Start Screening
          </Button>
        </CardContent>
      </Card>
    );
  }

  const medgemmaAgent = state.pipeline.find((a) => a.id === 'medgemma');
  const streamText = (medgemmaAgent?.output?.stream as string) || medgemmaAgent?.stream || '';

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Agent Pipeline Active</h3>
          <span className="text-xs text-slate-500">
            Case #{state.currentCaseId.slice(-6)} • {state.priority.toUpperCase()}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
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
        {state.isStreaming && streamText && (
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-100">
            <p className="text-xs font-medium text-sky-800 mb-1">MedGemma Live</p>
            <p className="text-sm text-slate-700">{streamText}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2"
          onClick={() => navigate('/pediscreen/agent-pipeline')}
        >
          View Full Pipeline
          <ArrowRight size={16} />
        </Button>
      </CardContent>
    </Card>
  );
}
