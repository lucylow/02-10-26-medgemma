import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Cpu, Server, Timer, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface PiDeviceMetrics {
  device_id: string;
  cpu: number;
  memory: number;
  model_loaded: string;
  inference_time_ms: number;
  queue_length: number;
  uptime: string;
  last_screening: string;
  last_heartbeat_at?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function EdgeDashboard() {
  const [devices, setDevices] = useState<PiDeviceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPABASE_URL) {
      setError("VITE_SUPABASE_URL is not configured.");
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setError(null);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/edge-metrics`, {
          headers: {
            ...(SUPABASE_PUBLISHABLE_KEY ? { apikey: SUPABASE_PUBLISHABLE_KEY } : {}),
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { devices?: PiDeviceMetrics[] };
        setDevices(data.devices ?? []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load edge metrics", err);
        setError("Unable to load edge device metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (!SUPABASE_URL) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Edge AI Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure <code className="font-mono text-xs">VITE_SUPABASE_URL</code> (and{" "}
            <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> if using auth)
            to enable Raspberry Pi 5 edge telemetry.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-muted rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-5/6 bg-muted rounded" />
                <div className="h-3 w-4/6 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Edge AI Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">
            Ensure the Supabase Edge Function{" "}
            <code className="font-mono text-xs">edge-metrics</code> is deployed and reachable.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-primary" />
            Edge AI Devices
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time Raspberry Pi 5 health for PediScreen deployments.
          </p>
        </div>
        <Badge variant={devices.length > 0 ? "default" : "outline"} className="flex items-center gap-1">
          <Wifi className={cn("w-3 h-3", devices.length ? "text-emerald-500" : "text-muted-foreground")} />
          {devices.length} active
        </Badge>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              No edge devices reporting yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Install Ollama and MedGemma on your Raspberry Pi 5.</li>
              <li>
                Configure the telemetry agent to POST metrics to{" "}
                <code className="font-mono text-xs">/functions/v1/edge-metrics</code>.
              </li>
              <li>Verify Supabase Edge Function logs show incoming device heartbeats.</li>
            </ol>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const cpu = Math.round(device.cpu);
            const mem = Math.round(device.memory);
            const inferenceMs = Math.round(device.inference_time_ms);

            const latencyBadge =
              inferenceMs < 2_000 ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-500/5">
                  ⚡ Fast
                </Badge>
              ) : inferenceMs < 5_000 ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-500/5">
                  ⏳ Moderate
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-500/40 text-red-700 bg-red-500/5">
                  🐌 Slow
                </Badge>
              );

            const queueVariant =
              device.queue_length === 0
                ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/30"
                : device.queue_length < 3
                  ? "bg-amber-500/10 text-amber-800 border-amber-500/30"
                  : "bg-red-500/10 text-red-800 border-red-500/30";

            return (
              <Card key={device.device_id} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {device.device_id || `Pi5-${device.model_loaded?.slice(-4) || "edge"}`}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {device.model_loaded || "Model not reported"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-[11px] font-medium border",
                        queueVariant,
                      )}
                    >
                      {device.queue_length} in queue
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Uptime: {device.uptime} • Last screening: {device.last_screening}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        CPU
                      </span>
                      <span className="font-mono text-xs">{cpu}%</span>
                    </div>
                    <Progress value={Math.min(Math.max(cpu, 0), 100)} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        Memory
                      </span>
                      <span className="font-mono text-xs">{mem}%</span>
                    </div>
                    <Progress value={Math.min(Math.max(mem, 0), 100)} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm mt-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Inference speed</span>
                      <span className="font-semibold">
                        {inferenceMs.toLocaleString()} ms
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {latencyBadge}
                      <Badge variant="outline" className="text-[11px]">
                        {device.last_heartbeat_at ? "Live" : "No heartbeat"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EdgeDashboard;

