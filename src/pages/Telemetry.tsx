import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, AlertTriangle, ArrowDownToLine, Brain, CheckCircle2, Clock, DollarSign, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => { fetchData(); }, [range]);

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
          {/* Connection status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {overview?.active_connection ? (
                  <div className="relative">
                    <Wifi className="w-8 h-8 text-emerald-500" />
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <WifiOff className="w-8 h-8 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Connection</p>
                  <p className="text-lg font-bold text-foreground">
                    {overview?.active_connection ? "Active" : "Inactive"}
                  </p>
                  <p className="text-xs text-muted-foreground">Last used {lastUsedLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total requests */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold text-foreground">{overview?.total_requests ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{successRate}% success rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg latency */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold text-foreground">{overview?.avg_latency_ms ?? 0}ms</p>
                  <p className="text-xs text-muted-foreground">
                    {overview?.fallback_count ?? 0} fallback{(overview?.fallback_count ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost & models */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Est. Cost</p>
                  <p className="text-2xl font-bold text-foreground">${(overview?.total_cost_usd ?? 0).toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">
                    {overview?.number_of_models ?? 0} model{(overview?.number_of_models ?? 0) !== 1 ? "s" : ""} used
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
          </TabsList>

          {/* Usage Trend */}
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calls per day</CardTitle>
              </CardHeader>
              <CardContent>
                {overview?.timeseries && overview.timeseries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={overview.timeseries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="Calls" />
                      <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} strokeWidth={2} name="Errors" />
                      <Area type="monotone" dataKey="fallbacks" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeWidth={1.5} name="Fallbacks" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p>No telemetry data for this period. Run a screening to generate events.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models tab */}
          <TabsContent value="models" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {models.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead className="text-right">Calls</TableHead>
                        <TableHead className="text-right">Avg Latency</TableHead>
                        <TableHead className="text-right">Error Rate</TableHead>
                        <TableHead className="text-right">Fallback Rate</TableHead>
                        <TableHead className="text-right">Est. Cost</TableHead>
                        <TableHead>Adapters</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((m) => (
                        <TableRow key={m.model_id}>
                          <TableCell className="font-medium">{m.model_id}</TableCell>
                          <TableCell>{m.provider}</TableCell>
                          <TableCell className="text-right">{m.calls}</TableCell>
                          <TableCell className="text-right">{m.avg_latency_ms}ms</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={m.error_rate > 5 ? "destructive" : "secondary"}>
                              {m.error_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={m.fallback_rate > 10 ? "outline" : "secondary"}>
                              {m.fallback_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">${m.cost_estimate_usd.toFixed(4)}</TableCell>
                          <TableCell>
                            {m.adapters.map(a => (
                              <Badge key={a} variant="outline" className="mr-1 text-xs">{a}</Badge>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No model data for this period.</p>
                )}
              </CardContent>
            </Card>
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    No fallbacks in this period
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic">
                  Fallbacks occur when the AI model is unavailable or returns unparseable output. The deterministic baseline is used instead.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
