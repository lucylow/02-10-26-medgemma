import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Plus, Activity, ShieldCheck, Brain, ArrowRight } from 'lucide-react';
import { useAgents } from '@/contexts/AgentContext';
import { listScreenings, type ScreeningListItem } from '@/services/screeningApi';
import { motion } from 'framer-motion';

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

function StatCard({
  icon: Icon,
  label,
  value,
  bgClass,
  iconBgClass,
  valueClass,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  bgClass: string;
  iconBgClass: string;
  valueClass: string;
}) {
  return (
    <Card className={`flex-1 border-none shadow-md ${bgClass}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBgClass}`}>
            <Icon size={24} className={valueClass} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentCasesList() {
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
  const [inputText, setInputText] = useState('');
  const [childAge, setChildAge] = useState(24);
  const { startPipeline } = useAgents();
  const navigate = useNavigate();

  const handleQuickScreen = async () => {
    await startPipeline(inputText || 'My child says about 10 words', childAge);
    navigate('/pediscreen/agent-pipeline');
  };

  const stats = {
    totalCases: 23,
    lowRisk: 18,
    needsReview: 5,
    avgConfidence: 87,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary">
            PediScreen AI Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Multi-agent orchestration • CDS validated • Real-time streaming
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Activity}
            label="Total Screenings"
            value={stats.totalCases}
            bgClass="bg-primary/10"
            iconBgClass="bg-primary/30"
            valueClass="text-primary"
          />
          <StatCard
            icon={ShieldCheck}
            label="Low Risk"
            value={stats.lowRisk}
            bgClass="bg-emerald-500/10"
            iconBgClass="bg-emerald-500/30"
            valueClass="text-emerald-600"
          />
          <StatCard
            icon={Plus}
            label="Needs Review"
            value={stats.needsReview}
            bgClass="bg-amber-500/10"
            iconBgClass="bg-amber-500/30"
            valueClass="text-amber-600"
          />
        </div>

        {/* Quick Screening */}
        <Card className="border-none shadow-lg bg-slate-50/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Quick Screening
            </CardTitle>
            <CardDescription>
              Enter observations to trigger smart agent routing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Describe observations (e.g., 'says 10 words, ignores name')"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 rounded-xl"
              />
              <Button
                size="default"
                className="rounded-xl bg-primary gap-2 shrink-0"
                onClick={handleQuickScreen}
              >
                <Mic size={20} />
                Voice
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="number"
                placeholder="Child age (months)"
                value={childAge}
                onChange={(e) => setChildAge(Number(e.target.value) || 24)}
                className="w-32 rounded-xl"
              />
              <Button
                className="flex-1 rounded-xl bg-primary"
                onClick={handleQuickScreen}
              >
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Cases */}
        <RecentCasesList />
      </motion.div>
    </div>
  );
}
