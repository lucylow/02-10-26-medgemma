import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Activity, Server, AlertTriangle, CheckCircle2 } from "lucide-react";

const AdminPanel: React.FC = () => {
  const agents = [
    { name: "Intake triage", status: "healthy", latencyMs: 120 },
    { name: "Embedding encoder", status: "healthy", latencyMs: 260 },
    { name: "MedGemma reasoning", status: "warm", latencyMs: 980 },
    { name: "Safety guardrail", status: "healthy", latencyMs: 190 },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Agent health & monitoring
            </h1>
            <p className="text-muted-foreground text-sm">
              View high-level performance of the multi-agent pipeline.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full text-xs px-4 py-1">
          Demo metrics • Not live PHI
        </Badge>
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
            <p className="text-2xl font-bold">42</p>
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
            <p className="text-2xl font-bold">1</p>
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
            Example latency for each stage in the pipeline (p50, simulated for demo).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-52">
            <div className="space-y-3 pr-2">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex flex-col gap-1 rounded-xl border px-3 py-2 bg-card/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{agent.name}</p>
                    <span className="text-xs text-muted-foreground">{agent.latencyMs} ms</span>
                  </div>
                  <Progress
                    value={Math.min(agent.latencyMs / 15, 100)}
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

