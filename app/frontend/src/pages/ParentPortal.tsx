import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Smile, ArrowRight, Baby, Calendar, Activity, MessageCircle } from "lucide-react";
import { MOCK_SCREENING_HISTORY, MOCK_CHILDREN_BY_ID } from "@/data/demoMockData";

type ParentSession = {
  id: string;
  childName: string;
  childId: string;
  date: string;
  domainLabel: string;
  riskLevel: string;
  summary: string;
};

const riskCopy: Record<string, { label: string; color: string; message: string }> = {
  "on track": {
    label: "On track",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    message: "Your child’s skills are developing as expected for their age.",
  },
  monitor: {
    label: "Keep an eye",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    message: "Some areas would benefit from extra practice and another check-in soon.",
  },
  refer: {
    label: "More support recommended",
    color: "bg-red-100 text-red-800 border-red-200",
    message: "We suggest talking with your clinician about extra evaluation and support.",
  },
};

const ParentPortal: React.FC = () => {
  const sessions: ParentSession[] = useMemo(
    () =>
      MOCK_SCREENING_HISTORY.map((h) => ({
        id: h.id,
        childName: h.childName,
        childId: h.childId,
        date: h.date,
        domainLabel: h.domainLabel,
        riskLevel: h.riskLevel,
        summary: h.summary,
      })),
    []
  );

  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id ?? null);
  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[0];
  const child = selected ? MOCK_CHILDREN_BY_ID[selected.childId] : null;
  const risk = selected
    ? riskCopy[selected.riskLevel.toLowerCase()] ?? riskCopy["on track"]
    : riskCopy["on track"];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 mb-2">
          <Heart className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Your Child&apos;s Progress
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Plain-language updates you can share with family, with ideas for everyday activities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3 lg:col-span-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              className="w-full text-left"
            >
              <Card
                className={
                  selectedId === s.id
                    ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
                    : "border-muted bg-card hover:bg-muted/40 transition-colors"
                }
              >
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{s.childName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.date} • {s.domainLabel}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs border ${riskCopy[s.riskLevel.toLowerCase()]?.color ?? ""}`}
                  >
                    {riskCopy[s.riskLevel.toLowerCase()]?.label ?? s.riskLevel}
                  </Badge>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {selected && (
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Baby className="w-5 h-5 text-emerald-600" />
                      {selected.childName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {selected.date} • {selected.domainLabel}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`px-3 py-1 text-xs font-semibold border ${risk.color}`}
                  >
                    {risk.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3">
                  <Smile className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">What this means</p>
                    <p className="text-sm text-emerald-800 mt-1">{risk.message}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">What we&apos;re seeing</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selected.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Card className="bg-muted/40">
                    <CardContent className="p-4 flex gap-3">
                      <Activity className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                          Try this at home
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Spend 10 minutes a day on a simple game that matches this area, like naming
                          things you see, stacking blocks, or pretend play.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/40">
                    <CardContent className="p-4 flex gap-3">
                      <MessageCircle className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                          Talk with your clinician
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Bring this summary to your next visit. It&apos;s designed to help you and
                          your clinician decide together on next steps.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {child && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${child.color}`}
                      >
                        {child.initials}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>Age: {child.age}</div>
                        <div>Last check-in: {child.lastScreening}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2 rounded-xl">
                      Share summary
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Optional home device check-ins (example)
                </CardTitle>
                <CardDescription className="text-xs">
                  If you connect a nursery camera or thermostat in the PediScreen app, you may see a
                  simple weekly summary here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Video</span>
                  <span>Tummy time about 14 minutes this week. Sitting attempts on 3 days.</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Sounds</span>
                  <span>
                    Lots of early sounds and babbling. Occasional upset cries, mostly at bedtime.
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Environment</span>
                  <span>The nursery stayed in a comfortable temperature range.</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  These home summaries are{" "}
                  <span className="font-semibold">extra context</span> only. They do not replace
                  check-ups or your clinician&apos;s judgement, and you can turn them off at any time.
                  PediScreen does not store raw video or audio from your home.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentPortal;

