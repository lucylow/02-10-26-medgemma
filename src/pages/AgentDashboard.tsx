import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Shield, Brain, TrendingUp } from 'lucide-react';
import { useAgents } from '@/contexts/AgentContext';
import { useAgentStats } from '@/hooks/useAgentStats';
import { listScreenings, type ScreeningListItem } from '@/services/screeningApi';
import { ConnectionStatus } from '@/components/pediscreen/ConnectionStatus';
import { AgentStatCard } from '@/components/pediscreen/AgentStatCard';
import { QuickActionRow } from '@/components/pediscreen/QuickActionRow';
import { LivePipelineStatus } from '@/components/pediscreen/LivePipelineStatus';
import { VoiceEntryPoint } from '@/components/pediscreen/VoiceEntryPoint';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatRiskLabel = (riskLevel?: string) => {
  const map: Record<string, string> = {
    low: 'On Track',
    medium: 'Monitor',
    high: 'Refer',
    on_track: 'On Track',
    monitor: 'Monitor',
    refer: 'Refer',
  };
  return map[riskLevel?.toLowerCase() || ''] || riskLevel || '—';
};

function RecentCasesGrid() {
  const [items, setItems] = useState<ScreeningListItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    listScreenings({ limit: 5, page: 0 })
      .then(({ items: list }) => setItems(list))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">No recent screenings yet</p>
          <Link to="/pediscreen/screening">
            <Button variant="outline" size="sm" className="mt-3 rounded-xl">
              Start First Screening
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Recent Cases</CardTitle>
        <CardDescription>Latest developmental screenings</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() =>
                  navigate('/pediscreen/results', {
                    state: {
                      screeningId: item.screening_id,
                      report: item.report,
                      childAge: String(item.child_age_months),
                      domain: item.domain,
                    },
                  })
                }
                className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">
                    Case #{item.screening_id?.slice(-6) ?? item.id.slice(-6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.child_age_months} mo • {formatRiskLabel(item.report?.riskLevel)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <Link to="/pediscreen/history">
          <Button variant="ghost" size="sm" className="w-full mt-2 rounded-xl">
            View All History
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function AgentDashboard() {
  const [quickInput, setQuickInput] = useState('');
  const [quickAge, setQuickAge] = useState(24);
  const { startPipeline } = useAgents();
  const navigate = useNavigate();
  const stats = useAgentStats();
  const isConnected = typeof navigator !== 'undefined' && navigator.onLine;

  const handleQuickScreen = async () => {
    await startPipeline(quickInput || 'Says 10 words, ignores name', quickAge);
    navigate('/pediscreen/agent-pipeline');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* HERO HEADER */}
        <div className="text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E3A8A]">
              PediScreen AI
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
              Multi-Agent Orchestration
            </span>
          </div>
          <p className="text-slate-600 text-center max-w-xl mx-auto">
            Voice → Smart Routing → Agent Pipeline → CDS Results
          </p>
          <ConnectionStatus isConnected={!!isConnected} />
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AgentStatCard
            icon={Activity}
            label="Total Cases"
            value={stats.total}
            color="#1E3A8A"
          />
          <AgentStatCard
            icon={Shield}
            label="Low Risk"
            value={stats.lowRisk}
            color="#10B981"
          />
          <AgentStatCard
            icon={Brain}
            label="AI Enhanced"
            value={stats.aiEnhanced}
            color="#3B82F6"
          />
          <AgentStatCard
            icon={TrendingUp}
            label="Avg Confidence"
            value={stats.avgConfidence}
            color="#F59E0B"
          />
        </div>

        {/* QUICK ACTIONS */}
        <QuickActionRow
          quickInput={quickInput}
          quickAge={quickAge}
          setQuickInput={setQuickInput}
          setQuickAge={setQuickAge}
          onQuickScreen={handleQuickScreen}
        />

        {/* LIVE PIPELINE STATUS */}
        <LivePipelineStatus />

        {/* VOICE ENTRY POINT */}
        <VoiceEntryPoint
          defaultAge={quickAge}
          onPipelineStart={() => navigate('/pediscreen/agent-pipeline')}
        />

        {/* RECENT CASES */}
        <RecentCasesGrid />
      </div>
    </div>
  );
}
