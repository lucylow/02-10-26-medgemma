import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_SCREENING_HISTORY } from "@/data/demoMockData";
import type { MockScreeningHistoryEntry } from "@/data/demoMockData";
import { listScreenings, mapToReviewEntry } from "@/services/screeningsApi";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Video,
  Activity,
} from "lucide-react";

const riskColors: Record<string, string> = {
  "on track":
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700",
  monitor:
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700",
  refer:
    "bg-red-50 text-red-900 border-red-200 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700",
};

const ClinicianReview: React.FC = () => {
  const [queue, setQueue] = useState<MockScreeningHistoryEntry[]>(MOCK_SCREENING_HISTORY);
  const [fromBackend, setFromBackend] = useState(false);

  useEffect(() => {
    let mounted = true;
    listScreenings({ limit: 50 })
      .then((res) => {
        if (!mounted) return;
        if (res.items?.length) {
          setQueue(res.items.map((item, i) => mapToReviewEntry(item, i)));
          setFromBackend(true);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const needsDiscussion = queue.filter(
    (h) => h.riskLevel.toLowerCase() === "monitor" || h.riskLevel.toLowerCase() === "refer"
  ).length;
  const onTrack = queue.filter((h) => h.riskLevel.toLowerCase() === "on track").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Clinician Review Queue
            </h1>
            <p className="text-muted-foreground text-sm">
              Draft reports waiting for human-in-the-loop review and sign-off.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fromBackend && (
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              From backend
            </Badge>
          )}
          <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-semibold">
            {queue.length} pending
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4" />
              Needs discussion
            </CardTitle>
            <CardDescription className="text-xs text-amber-800">
              Higher-risk or unclear cases.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold text-amber-900">{needsDiscussion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">On-track check-ins</CardTitle>
            <CardDescription className="text-xs">
              Lower-risk, mostly reassurance and guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold">{onTrack}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Median turnaround</CardTitle>
            <CardDescription className="text-xs">
              {fromBackend ? "Review times from queue." : "For this demo, review times and alerts are simulated."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold">~15 min</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Video className="w-4 h-4 text-sky-600" />
            Passive home surveillance context
          </CardTitle>
          <CardDescription className="text-xs">
            Edge AI from nursery cams, doorbells, and thermostats can surface patterns that complement
            active clinic and wearable screenings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs sm:text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border px-3 py-2 bg-sky-50/70 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sky-900 text-xs">Video (Nest cam)</span>
                <Badge variant="outline" className="text-[10px]">
                  Motor P12
                </Badge>
              </div>
              <p className="text-[11px] text-sky-900/80">
                Tummy time 14 min/wk, sitting attempts 3/10. No independent cruising yet.
              </p>
            </div>
            <div className="rounded-xl border px-3 py-2 bg-violet-50/70 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-violet-900 text-xs">Audio (Ecobee)</span>
                <Badge variant="outline" className="text-[10px]">
                  Speech P8
                </Badge>
              </div>
              <p className="text-[11px] text-violet-900/80">
                Babbling CV ratio 0.23 with mostly vowel sounds for age; occasional distress cries
                overnight.
              </p>
            </div>
            <div className="rounded-xl border px-3 py-2 bg-emerald-50/80 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-emerald-900 text-xs">Environment</span>
                <Badge variant="outline" className="text-[10px]">
                  Stable
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-900/80">
                Nursery 72–76°F, typical occupancy patterns. No major changes in routine detected.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
            <div className="inline-flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                Fusion rule (demo): 2+ domains with P&lt;10–20 → highlight for developmental screening.
              </span>
            </div>
            <div className="inline-flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Passive environmental monitoring provides context; clinical screening still relies on active input.</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Smart home feeds are treated as{" "}
            <span className="font-semibold">clinical decision support</span> — PediScreen ingests only
            edge-generated features and percentile scores, not raw video or audio.
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="h-[420px] rounded-xl border bg-card">
        <div className="p-4 space-y-3">
          {queue.map((entry) => {
            const color =
              riskColors[entry.riskLevel.toLowerCase()] ??
              "bg-slate-50 text-slate-800 border-slate-200";
            return (
              <Card
                key={entry.id}
                className={`border flex flex-col sm:flex-row sm:items-stretch ${color}`}
              >
                <CardContent className="flex-1 py-3 px-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>{entry.childName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{entry.date}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[11px] rounded-full">
                      {entry.domainLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[11px] rounded-full border ${color}`}
                    >
                      {entry.riskLevel}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {entry.summary}
                  </p>
                </CardContent>
                <div className="px-4 py-3 border-t sm:border-t-0 sm:border-l flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg gap-1.5 text-destructive border-destructive/40"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Revise
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ClinicianReview;

