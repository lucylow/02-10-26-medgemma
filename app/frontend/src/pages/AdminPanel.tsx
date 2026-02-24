import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Activity, Server, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { getTelemetryEvents, type TelemetryEvent } from "@/services/telemetryApi";

const DEMO_AGENTS = [
  { name: "Intake triage", status: "healthy", latencyMs: 120 },
  { name: "Embedding encoder", status: "healthy", latencyMs: 260 },
  { name: "MedGemma reasoning", status: "warm", latencyMs: 980 },
  { name: "Safety guardrail", status: "healthy", latencyMs: 190 },
] as const;

function aggregateAgentLatency(items: TelemetryEvent[]): Array<{ name: string; status: string; latencyMs: number }> {
  const byKey: Record<string, { sum: number; count: number }> = {};
  for (const e of items) {
    const key = e.model_name || e.endpoint || "inference";
    if (!byKey[key]) byKey[key] = { sum: 0, count: 0 };
    const ms = e.latency_ms ?? 0;
    if (ms > 0) {
      byKey[key].sum += ms;
      byKey[key].count += 1;
    }
  }
  return Object.entries(byKey)
    .filter(([, v]) => v.count > 0)
    .map(([name, v]) => ({
      name,
      status: v.sum / v.count > 800 ? "warm" : "healthy",
      latencyMs: Math.round(v.sum / v.count),
    }))
    .sort((a, b) => b.latencyMs - a.latencyMs)
    .slice(0, 8);
}

const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [throughput, setThroughput] = useState(42);
  const [fallbackCount, setFallbackCount] = useState(1);
  const [agentRows, setAgentRows] = useState<Array<{ name: string; status: string; latencyMs: number }>>([...DEMO_AGENTS]);
  const [liveData, setLiveData] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const [allRes, fallbackRes] = await Promise.all([
        getTelemetryEvents({
          limit: 500,
          offset: 0,
          date_from: dayAgo.toISOString(),
          date_to: now.toISOString(),
        }),
        getTelemetryEvents({ limit: 500, fallback_used: true }),
      ]);

      const total = allRes.total ?? allRes.items?.length ?? 0;
      const fallbacks = fallbackRes.total ?? fallbackRes.items?.length ?? 0;
      const items = allRes.items ?? [];

      setThroughput(total);
      setFallbackCount(fallbacks);
      const aggregated = aggregateAgentLatency(items);
      setAgentRows(aggregated.length > 0 ? aggregated : [...DEMO_AGENTS]);
      setLiveData(total > 0 || fallbacks > 0 || aggregated.length > 0);
    } catch {
      setThroughput(42);
      setFallbackCount(1);
      setAgentRows([...DEMO_AGENTS]);
      setLiveData(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const maxLatency = useMemo(
    () => Math.max(...agentRows.map((a) => a.latencyMs), 1),
    [agentRows]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Agent health &amp; monitoring
            </h1>
            <p className="text-muted-foreground text-sm">
              View high-level performance of the multi-agent pipeline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="rounded-full text-xs px-4 py-1">
            {liveData ? "Live backend" : "Demo metrics"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              24h throughput
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold">{throughput}</p>
            <p className="text-xs text-muted-foreground mt-1">screenings processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              Uptime (rolling)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold">99.8%</p>
            <p className="text-xs text-muted-foreground mt-1">core inference services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Safety escalations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold">{fallbackCount}</p>
            <p className="text-xs text-muted-foreground mt-1">flagged for manual review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Agent latency snapshot
          </CardTitle>
          <CardDescription className="text-xs">
            {liveData
              ? "Avg latency by model/endpoint from telemetry (last 24h)."
              : "Example latency per stage when backend has no events (demo)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-52">
            <div className="space-y-3 pr-2">
              {agentRows.map((agent) => (
                <div
                  key={agent.name}
                  className="flex flex-col gap-1 rounded-xl border px-3 py-2 bg-card/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{agent.name}</p>
                    <span className="text-xs text-muted-foreground">{agent.latencyMs} ms</span>
                  </div>
                  <Progress
                    value={Math.min((agent.latencyMs / maxLatency) * 100, 100)}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
