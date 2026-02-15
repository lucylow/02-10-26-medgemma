/**
 * QuickActionRow — Quick screening input + age + analyze
 */

import React from 'react';
import { Brain, Mic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgents } from '@/contexts/AgentContext';
import { useNavigate } from 'react-router-dom';

export interface QuickActionRowProps {
  quickInput: string;
  quickAge: number;
  setQuickInput: (v: string) => void;
  setQuickAge: (v: number) => void;
  onQuickScreen: () => void;
}

export function QuickActionRow({
  quickInput,
  quickAge,
  setQuickInput,
  setQuickAge,
  onQuickScreen,
}: QuickActionRowProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-slate-200 bg-slate-50/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain size={20} className="text-primary" />
          Quick Screening
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter observations to trigger smart agent routing
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="e.g., Says 10 words, ignores name"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            className="flex-1 rounded-xl"
          />
          <Button
            size="default"
            variant="outline"
            className="rounded-xl gap-2 shrink-0"
            onClick={() => navigate('/pediscreen/voice')}
          >
            <Mic size={18} />
            Voice
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="number"
            placeholder="Child age (months)"
            value={quickAge}
            onChange={(e) => setQuickAge(Number(e.target.value) || 24)}
            className="w-32 rounded-xl"
          />
          <Button
            className="flex-1 rounded-xl bg-primary gap-2"
            onClick={onQuickScreen}
          >
            <Brain size={18} />
            Analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
