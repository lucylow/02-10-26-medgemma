import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, AlertTriangle, Brain, CheckCircle2, Clock, DollarSign, RefreshCw, Scale, Wifi, WifiOff, Zap } from "lucide-react";
import { toast } from "sonner";
import { OverviewCard } from "@/components/charts/OverviewCard";
import { UsageTimeseries } from "@/components/charts/UsageTimeseries";
import { ModelTable } from "@/components/charts/ModelTable";
import { FairnessBarChart, type FairnessDataPoint } from "@/components/charts/FairnessBarChart";

const BACKEND_URL = import.meta.env.VITE_PEDISCREEN_BACKEND_URL;
const API_KEY = import.meta.env.VITE_API_KEY || "dev-example-key";

interface FairnessItem {
  group_value?: string;
  false_positive_rate?: number;
  false_negative_rate?: number;
}

interface OverviewData {
  active_connection: boolean;
  last_used: string | null;
  total_requests: number;
  success_count: number;
  error_count: number;
  fallback_count: number;
  avg_latency_ms: number;
  total_cost_usd: number;
  number_of_models: number;
  top_model: { model_id: string; calls: number } | null;
  timeseries: { date: string; calls: number; errors: number; fallbacks: number; cost: number }[];
}

interface ModelData {
  model_id: string;
  provider: string;
  calls: number;
  avg_latency_ms: number;
  error_rate: number;
  fallback_rate: number;
  cost_estimate_usd: number;
  adapters: string[];
  last_used: string;
}

interface ErrorData {
  id: string;
  timestamp: string;
  model_id: string | null;
  error_code: string | null;
  status_code: number;
  fallback_reason: string | null;
  latency_ms: number | null;
  trace_id: string | null;
}

interface FallbackData {
  id: string;
  timestamp: string;
  model_id: string | null;
  fallback_reason: string | null;
  screening_id: string | null;
  latency_ms: number | null;
}

export default function Telemetry() {
  const [range, setRange] = useState("7d");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [models, setModels] = useState<ModelData[]>([]);
  const [errors, setErrors] = useState<ErrorData[]>([]);
  const [fallbacks, setFallbacks] = useState<FallbackData[]>([]);
  const [fallbackReasons, setFallbackReasons] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [fairnessData, setFairnessData] = useState<FairnessDataPoint[]>([]);
  const [fairnessLoading, setFairnessLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telemetry`;
      const headers = {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };

      const [ovRes, modRes, errRes, fbRes] = await Promise.all([
        fetch(`${base}?action=overview&range=${range}`, { headers }),
        fetch(`${base}?action=models&range=${range}`, { headers }),
        fetch(`${base}?action=errors&range=${range}`, { headers }),
        fetch(`${base}?action=fallbacks&range=${range}`, { headers }),
      ]);

      const [ovData, modData, errData, fbData] = await Promise.all([
        ovRes.json(), modRes.json(), errRes.json(), fbRes.json(),
      ]);

      setOverview(ovData);
      setModels(modData.models || []);
      setErrors(errData.errors || []);
      setFallbacks(fbData.fallbacks || []);
      setFallbackReasons(fbData.reason_summary || {});
    } catch (err) {
      toast.error("Failed to load telemetry data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFairness = async () => {
    if (!BACKEND_URL) {
      setFairnessData([]);
      setFairnessLoading(false);
      return;
    }
    setFairnessLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/telemetry/fairness?limit=200`, {
        headers: { "x-api-key": API_KEY },
      });
      const json = await res.json();
      const items: FairnessItem[] = json.items || [];
      // Aggregate by group_value (latest per group for chart)
      const byGroup = new Map<string, { fpr: number; fnr: number }>();
      for (const row of items) {
        const g = row.group_value || "unknown";
        if (!byGroup.has(g)) {
          byGroup.set(g, {
            fpr: row.false_positive_rate ?? 0,
            fnr: row.false_negative_rate ?? 0,
          });
        }
      }
      const chartData: FairnessDataPoint[] = Array.from(byGroup.entries()).map(([group, v]) => ({
        group,
        false_positive_rate: v.fpr,
        false_negative_rate: v.fnr,
      }));
      setFairnessData(chartData);
    } catch {
      setFairnessData([]);
    } finally {
      setFairnessLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [range]);
  useEffect(() => { if (tab === "fairness") fetchFairness(); }, [tab]);

  const successRate = overview && overview.total_requests > 0
    ? Math.round((overview.success_count / overview.total_requests) * 10000) / 100
    : 100;

  const lastUsedLabel = useMemo(() => {
    if (!overview?.last_used) return "Never";
    const diff = Date.now() - new Date(overview.last_used).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [overview?.last_used]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              AI Usage & Telemetry
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Model performance, usage analytics, and operational health
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Status cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            icon={overview?.active_connection ? Wifi : WifiOff}
            iconClassName={overview?.active_connection ? "text-success" : "text-muted-foreground"}
            pulse={overview?.active_connection ?? false}
            title="AI Connection"
            value={overview?.active_connection ? "Active" : "Inactive"}
            subtitle={`Last used ${lastUsedLabel}`}
          />
          <OverviewCard
            icon={Zap}
            iconClassName="text-primary"
            title="Total Requests"
            value={overview?.total_requests ?? "—"}
            subtitle={`${successRate}% success rate`}
          />
          <OverviewCard
            icon={Clock}
            iconClassName="text-warning"
            title="Avg Latency"
            value={`${overview?.avg_latency_ms ?? 0}ms`}
            subtitle={`${overview?.fallback_count ?? 0} fallback${(overview?.fallback_count ?? 0) !== 1 ? "s" : ""}`}
          />
          <OverviewCard
            icon={DollarSign}
            iconClassName="text-success"
            title="Est. Cost"
            value={`$${(overview?.total_cost_usd ?? 0).toFixed(4)}`}
            subtitle={`${overview?.number_of_models ?? 0} model${(overview?.number_of_models ?? 0) !== 1 ? "s" : ""} used`}
          />
        </div>

        {/* Top model badge */}
        {overview?.top_model && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            Top model: <Badge variant="secondary">{overview.top_model.model_id}</Badge>
            <span>({overview.top_model.calls} calls)</span>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Usage Trend</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="errors">
              Errors
              {(overview?.error_count ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs px-1.5">
                  {overview?.error_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fallbacks">
              Fallbacks
              {(overview?.fallback_count ?? 0) > 0 && (
                <Badge variant="outline" className="ml-1.5 text-xs px-1.5">
                  {overview?.fallback_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fairness">Fairness</TabsTrigger>
          </TabsList>

          {/* Usage Trend */}
          <TabsContent value="overview" className="mt-4">
            <UsageTimeseries data={overview?.timeseries ?? []} />
          </TabsContent>

          {/* Models tab */}
          <TabsContent value="models" className="mt-4">
            <ModelTable models={models} />
          </TabsContent>

          {/* Errors tab */}
          <TabsContent value="errors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {errors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Error Code</TableHead>
                        <TableHead>Latency</TableHead>
                        <TableHead>Trace</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(0, 20).map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs">{new Date(e.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{e.model_id || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{e.status_code}</Badge>
                          </TableCell>
                          <TableCell>{e.error_code || "—"}</TableCell>
                          <TableCell>{e.latency_ms ?? "—"}ms</TableCell>
                          <TableCell className="text-xs font-mono truncate max-w-[120px]">
                            {e.trace_id?.slice(0, 8) || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    No errors in this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fallbacks tab */}
          <TabsContent value="fallbacks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fallback Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reason summary badges */}
                {Object.keys(fallbackReasons).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(fallbackReasons).map(([reason, count]) => (
                      <Badge key={reason} variant="outline">
                        {reason}: {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {fallbacks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Screening</TableHead>
                        <TableHead>Latency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fallbacks.slice(0, 20).map(f => (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs">{new Date(f.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{f.fallback_reason || "unknown"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono truncate max-w-[140px]">
                            {f.screening_id || "—"}
                          </TableCell>
                          <TableCell>{f.latency_ms ?? "—"}ms</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    No fallbacks in this period
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic">
                  Fallbacks occur when the AI model is unavailable or returns unparseable output. The deterministic baseline is used instead.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bias & Fairness tab (Phase 4) */}
          <TabsContent value="fairness" className="mt-4">
            {fairnessLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading fairness metrics…
              </div>
            ) : (
              <FairnessBarChart
                data={fairnessData}
                title="Fairness metrics by protected group (FPR / FNR)"
                height={340}
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              False positive and false negative rates by group. Monitor for demographic parity and equalized odds.
            </p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
