import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_SCREENING_HISTORY } from "@/data/demoMockData";
import { ClipboardList, CheckCircle2, XCircle, AlertTriangle, User, Calendar } from "lucide-react";

const riskColors: Record<string, string> = {
  "on track":
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700",
  monitor:
    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700",
  refer:
    "bg-red-50 text-red-900 border-red-200 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700",
};

const ClinicianReview: React.FC = () => {
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
        <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-semibold">
          {MOCK_SCREENING_HISTORY.length} pending
        </Badge>
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
            <p className="text-2xl font-bold text-amber-900">
              {
                MOCK_SCREENING_HISTORY.filter(
                  (h) => h.riskLevel.toLowerCase() === "monitor" || h.riskLevel.toLowerCase() === "refer"
                ).length
              }
            </p>
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
            <p className="text-2xl font-bold">
              {
                MOCK_SCREENING_HISTORY.filter(
                  (h) => h.riskLevel.toLowerCase() === "on track"
                ).length
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Median turnaround</CardTitle>
            <CardDescription className="text-xs">
              For this demo, review times are simulated.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-2xl font-bold">~15 min</p>
          </CardContent>
        </Card>
      </div>

      <ScrollArea className="h-[420px] rounded-xl border bg-card">
        <div className="p-4 space-y-3">
          {MOCK_SCREENING_HISTORY.map((entry) => {
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

