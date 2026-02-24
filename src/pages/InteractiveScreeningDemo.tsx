/**
 * Interactive Screening Demo — CHW Screening + Clinician Review
 * Two-tab page matching the static demo: enter observations as CHW, see MedGemma report,
 * and preview clinician review queue with simulated cases.
 */
import React, { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Heart, Sparkles, Loader2, Eye, Stethoscope, UserCircle, ImageIcon, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitScreening } from "@/services/screeningApi";
import { mapScreeningResultToMedGemmaReport } from "@/api/medgemmaAdapter";
import { toast } from "sonner";

// ——— Demo report shape (CHW right panel) ———
type DemoReport = {
  riskLevel: "low" | "medium" | "high" | "unknown";
  confidence: number;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  evidence: { type: string; content: string; influence?: number }[];
};

// ——— Smart mock scenarios (from static demo) ———
const MOCK_SCENARIOS: Array<{
  id: string;
  trigger: RegExp;
  ageRange: [number, number];
  domain: string | null;
  riskLevel: DemoReport["riskLevel"];
  confidence: number;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  evidence: { type: string; content: string; influence: number }[];
}> = [
  {
    id: "hr-1",
    trigger: /no words|no babbling|regression|lost words/i,
    ageRange: [18, 36],
    domain: "communication",
    riskLevel: "high",
    confidence: 0.95,
    summary:
      "Significant expressive language delay and possible regression. Child is not using single words at an age when 2-word phrases are expected.",
    keyFindings: [
      "Parent reports no clear words or phrases at 24+ months.",
      "Caregiver describes loss of previously used sounds or words.",
      "Combination of age and regression suggests urgent follow-up.",
    ],
    recommendations: [
      "Urgent referral to pediatrician and speech-language pathologist.",
      "Immediate hearing evaluation and developmental screening (e.g., ASQ-3, M-CHAT-R).",
      "Provide caregivers with guidance on early communication strategies while waiting for formal assessment.",
    ],
    evidence: [
      { type: "text", content: '"No babbling after 12 months, stopped saying "mama".', influence: 0.9 },
      { type: "score", content: "Communication markers appear well below expected range.", influence: 0.85 },
    ],
  },
  {
    id: "mr-1",
    trigger: /10 words|few words|limited vocabulary|points instead/i,
    ageRange: [18, 36],
    domain: "communication",
    riskLevel: "medium",
    confidence: 0.84,
    summary:
      "Expressive vocabulary is below expectations, but some communication skills are present. Monitoring and targeted support are appropriate.",
    keyFindings: [
      "Child uses about 10 single words; typical range is broader at this age.",
      "Relies on pointing and sounds rather than 2-word phrases.",
      "No clear loss of skills described; concern is mainly pace of progress.",
    ],
    recommendations: [
      "Schedule a formal language screening within 3 months.",
      "Encourage daily reading, naming, and turn-taking games.",
      "If no progress or additional concerns arise, refer to speech-language services.",
    ],
    evidence: [{ type: "text", content: '"Says around ten words, points for most things."', influence: 0.82 }],
  },
  {
    id: "lr-1",
    trigger: /typical|on track|doing well|no concerns/i,
    ageRange: [12, 60],
    domain: null,
    riskLevel: "low",
    confidence: 0.9,
    summary:
      "Reported behaviors are broadly consistent with expected developmental milestones for this age group.",
    keyFindings: [
      "Caregiver describes age-appropriate play, communication, and motor skills.",
      "No regression, safety concerns, or major delays mentioned.",
      "Social engagement and responsiveness appear typical.",
    ],
    recommendations: [
      "Continue routine well-child visits as scheduled.",
      "Encourage daily play, reading, and talking together.",
      "Repeat screening at recommended intervals or if new concerns arise.",
    ],
    evidence: [{ type: "text", content: "Observations suggest typical milestone progression.", influence: 0.7 }],
  },
  {
    id: "motor-1",
    trigger: /stumble|clumsy|falls|trip|can't jump|weak/i,
    ageRange: [18, 48],
    domain: "gross-motor",
    riskLevel: "medium",
    confidence: 0.78,
    summary:
      "Gross motor coordination warrants monitoring. Child may benefit from opportunities to practice balance and strength activities.",
    keyFindings: [
      "Caregiver notes frequent stumbling or falls during play.",
      "Jumping, running, or climbing appear harder than for peers.",
      "No acute injury or sudden regression described.",
    ],
    recommendations: [
      "Discuss concerns with pediatrician; consider physical or occupational therapy evaluation.",
      "Promote safe activities that practice balance and coordination.",
      "Re-screen motor skills in 3–6 months or sooner if concerns increase.",
    ],
    evidence: [
      {
        type: "text",
        content: '"Trips a lot when running, struggles to jump with both feet."',
        influence: 0.76,
      },
    ],
  },
  {
    id: "edge-unknown",
    trigger: /.*/i,
    ageRange: [6, 60],
    domain: null,
    riskLevel: "unknown",
    confidence: 0.4,
    summary:
      "The information provided is not specific enough to estimate risk. A structured questionnaire would provide clearer guidance.",
    keyFindings: [
      "Observations are brief or unclear.",
      "No specific delays or regressions are described.",
      "Additional detail is needed to support a meaningful summary.",
    ],
    recommendations: [
      "Use a standardized developmental screening tool (e.g., ASQ-3).",
      "Ask caregivers for more examples of skills and concerns.",
      "Repeat screening once more detailed information is available.",
    ],
    evidence: [{ type: "text", content: "Limited or nonspecific description of behavior.", influence: 0.6 }],
  },
];

function pickMockScenario(
  age: number,
  domain: string | null,
  obsText: string
): (typeof MOCK_SCENARIOS)[0] {
  const text = (obsText || "").toLowerCase();
  const ageNum = Number(age) || 24;
  const domainVal = domain || null;
  for (const s of MOCK_SCENARIOS) {
    const inRange = ageNum >= s.ageRange[0] && ageNum <= s.ageRange[1];
    const domainMatch = !s.domain || !domainVal || s.domain === domainVal;
    if (inRange && domainMatch && s.trigger.test(text)) return s;
  }
  if (/doing well|on track|no concerns/.test(text)) {
    return MOCK_SCENARIOS.find((s) => s.id === "lr-1")!;
  }
  return MOCK_SCENARIOS.find((s) => s.id === "edge-unknown")!;
}

// ——— Clinician queue (simulated cases) ———
const CLINICIAN_CASES = [
  {
    id: "PS-00123",
    childName: '"S." (24mo)',
    riskLevel: "high" as const,
    summary: "No clear words at 24 months; regression from prior babbling reported.",
    highlight: "Urgent referral recommended.",
    domain: "Communication",
    generatedAt: "Today • 10:14",
  },
  {
    id: "PS-00487",
    childName: '"J." (30mo)',
    riskLevel: "medium" as const,
    summary: "Uses about 10 words and gestures; language lag may be present.",
    highlight: "Monitor and schedule language screening.",
    domain: "Communication",
    generatedAt: "Yesterday • 16:32",
  },
  {
    id: "PS-00211",
    childName: '"A." (18mo)',
    riskLevel: "low" as const,
    summary: "Caregiver reports typical play and response to name, no concerns.",
    highlight: "Routine monitoring only.",
    domain: "All domains",
    generatedAt: "Last week",
  },
  {
    id: "PS-00512",
    childName: '"M." (36mo)',
    riskLevel: "medium" as const,
    summary: "Trips frequently when running; difficulty jumping with both feet. Gross motor coordination below expectations.",
    highlight: "Consider PT evaluation.",
    domain: "Gross Motor",
    generatedAt: "Today • 08:22",
  },
];

const DOMAIN_OPTIONS = [
  { value: "_", label: "Select a domain" },
  { value: "communication", label: "Communication / Language" },
  { value: "gross-motor", label: "Gross Motor" },
  { value: "fine-motor", label: "Fine Motor" },
  { value: "cognitive", label: "Problem Solving" },
  { value: "social", label: "Personal-Social" },
];

export default function InteractiveScreeningDemo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "clinician" ? "clinician" : "chw";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [ageMonths, setAgeMonths] = useState(24);

  // Sync tab with URL for deep linking and browser back/forward
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "clinician" || t === "chw") setActiveTab(t);
  }, [searchParams]);

  const setTab = (value: string) => {
    setActiveTab(value);
    setSearchParams(value === "chw" ? {} : { tab: value }, { replace: true });
  };
  const [domain, setDomain] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [useBackend, setUseBackend] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [report, setReport] = useState<DemoReport | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCase = selectedCaseId
    ? CLINICIAN_CASES.find((c) => c.id === selectedCaseId)
    : null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    if (!observations.trim()) {
      toast.error("Please enter observations before analyzing.");
      return;
    }
    setAnalyzing(true);
    setReport(null);
    setScreeningId(null);
    try {
      if (useBackend) {
        try {
          const result = await submitScreening({
            childAge: String(ageMonths),
            domain: domain || "",
            observations: observations.trim(),
            imageFile: imageFile || undefined,
          });
          if (result.success && result.report && result.screeningId) {
            const mapped = mapScreeningResultToMedGemmaReport(result, result.screeningId);
            const riskKey = (mapped.riskAssessment?.overall || "Unknown").toLowerCase();
            let riskLevel: DemoReport["riskLevel"] = "unknown";
            if (riskKey.includes("high") || riskKey.includes("refer")) riskLevel = "high";
            else if (riskKey.includes("medium") || riskKey.includes("monitor")) riskLevel = "medium";
            else if (riskKey.includes("low") || riskKey.includes("track")) riskLevel = "low";
            setReport({
              riskLevel,
              confidence: result.confidence ?? 0.8,
              summary: mapped.clinicalSummary,
              keyFindings: mapped.evidence?.map((e) => e.summary) ?? [],
              recommendations: mapped.recommendations ?? [],
              evidence: (mapped.evidence ?? []).map((e) => ({
                type: e.type,
                content: e.summary,
                influence: e.confidence,
              })),
            });
            setScreeningId(result.screeningId);
            toast.success("Received response from backend.");
          } else {
            throw new Error(result.message || "Analysis failed");
          }
        } catch (err) {
          toast.info("Backend unavailable, using smart mock.");
          const scenario = pickMockScenario(ageMonths, domain || null, observations);
          const demoReport: DemoReport = {
            riskLevel: scenario.riskLevel,
            confidence: scenario.confidence,
            summary: scenario.summary,
            keyFindings: scenario.keyFindings,
            recommendations: scenario.recommendations,
            evidence: [...scenario.evidence],
          };
          if (imageFile) {
            demoReport.evidence.push({
              type: "image",
              content: "Image evidence (mock): appears consistent with age-expected motor skills.",
              influence: 0.6,
            });
          }
          setReport(demoReport);
          setScreeningId("PS-MOCK-" + scenario.id.toUpperCase());
        }
      } else {
        const scenario = pickMockScenario(ageMonths, domain || null, observations);
        const demoReport: DemoReport = {
          riskLevel: scenario.riskLevel,
          confidence: scenario.confidence,
          summary: scenario.summary,
          keyFindings: scenario.keyFindings,
          recommendations: scenario.recommendations,
          evidence: [...scenario.evidence],
        };
        if (imageFile) {
          demoReport.evidence.push({
            type: "image",
            content: "Image evidence (mock): appears consistent with age-expected motor skills.",
            influence: 0.6,
          });
        }
        setReport(demoReport);
        setScreeningId("PS-MOCK-" + scenario.id.toUpperCase());
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const riskStyles = {
    high: "bg-red-50 border-red-200 text-red-800",
    medium: "bg-amber-50 border-amber-200 text-amber-800",
    low: "bg-green-50 border-green-200 text-green-800",
    unknown: "bg-slate-100 border-slate-200 text-slate-700",
  };
  const riskLabels = {
    high: "Discuss / refer",
    medium: "Monitor",
    low: "On track",
    unknown: "Unknown",
  };
  const badgeStyles = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header with back link */}
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-2xl mx-4 mt-4 p-5 shadow-lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Link
              to="/pediscreen"
              className="inline-flex items-center gap-2 text-primary-foreground/90 hover:text-white text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to PediScreen
            </Link>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white/15 border-white/30">
                Google MedGemma
              </Badge>
              <Badge variant="secondary" className="bg-white/15 border-white/30">
                Edge-friendly UI
              </Badge>
              <Badge variant="secondary" className="bg-white/15 border-white/30">
                CDS, not diagnosis
              </Badge>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
                  <Stethoscope className="w-5 h-5" />
                </span>
                PediScreen AI
              </h1>
              <p className="text-sm opacity-95 mt-1 max-w-xl">
                MedGemma-powered pediatric developmental screening. Designed for community health workers and
                clinicians, as a clinical decision support tool—not a diagnostic device.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Interactive Screening Demo
            </CardTitle>
            <CardDescription>
              Try a full end-to-end screening flow. Enter observations as a CHW, see a MedGemma-style structured
              report, and preview how a clinician might review and sign off.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs value={activeTab} onValueChange={setTab}>
              <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="chw" className="gap-2 rounded-lg">
                  <UserCircle className="w-4 h-4" />
                  CHW Screening
                </TabsTrigger>
                <TabsTrigger value="clinician" className="gap-2 rounded-lg">
                  <Stethoscope className="w-4 h-4" />
                  Clinician Review
                </TabsTrigger>
              </TabsList>

              {/* CHW Screening tab */}
              <TabsContent value="chw" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Child & Observations */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">Child & Observations</h3>
                    <div className="space-y-2">
                      <Label className="flex justify-between items-baseline">
                        <span>Child age (months)</span>
                        <span className="text-muted-foreground font-normal" aria-live="polite">
                          {ageMonths} months
                        </span>
                      </Label>
                      <Slider
                        min={6}
                        max={60}
                        step={1}
                        value={[ageMonths]}
                        onValueChange={([v]) => setAgeMonths(v)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Typical screenings: 6–60 months. Slide to adjust age.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-domain">Primary developmental domain</Label>
                      <Select
                        value={domain || "_"}
                        onValueChange={(v) => setDomain(v === "_" ? "" : v)}
                      >
                        <SelectTrigger id="demo-domain" className="w-full">
                          <SelectValue placeholder="Select a domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOMAIN_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        This helps the model focus its reasoning, but all text is considered.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="demo-observations" className="flex justify-between items-start gap-2">
                        <span>Observations from caregiver / CHW</span>
                        <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                          Try: &quot;Says about 10 words, points instead of phrases.&quot;
                        </span>
                      </Label>
                      <Textarea
                        id="demo-observations"
                        placeholder="Describe behaviors, concerns, milestones..."
                        className="min-h-[120px] resize-y"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Describe behaviors, concerns, milestones, regressions, or &quot;gut feelings.&quot;
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex justify-between items-center">
                        <span>Visual evidence (optional)</span>
                        <span className="text-xs font-normal text-muted-foreground">Drawings, play, posture, etc.</span>
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                        className="border border-dashed rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer"
                      >
                        <ImageIcon className="w-5 h-5 shrink-0" />
                        {imagePreview ? (
                          <span className="text-primary font-medium">Image attached (simulated on-device analysis)</span>
                        ) : (
                          <span>Click to upload an example image or drawing (simulated on-device analysis).</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <label htmlFor="demo-use-backend" className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox id="demo-use-backend" checked={useBackend} onCheckedChange={(c) => setUseBackend(!!c)} />
                        Use backend API if available (fallback to smart mock).
                      </label>
                      <Button onClick={handleAnalyze} disabled={analyzing || !observations.trim()} className="gap-2">
                        {analyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Analyze with MedGemma
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        <strong>Note:</strong> This demo shows a clinical decision support pattern. It does not provide
                        medical diagnosis and must be reviewed by a qualified clinician.
                      </p>
                    </div>
                  </div>

                  {/* Right: MedGemma Screening Report */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">MedGemma Screening Report</h3>
                    {!report ? (
                      <p className="text-sm text-muted-foreground">
                        Run an analysis to see a structured risk summary, key findings, recommendations, and evidence.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div
                          className={cn(
                            "rounded-xl border-l-4 p-4",
                            riskStyles[report.riskLevel]
                          )}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Heart className="w-5 h-5" />
                            <span className="font-semibold">{riskLabels[report.riskLevel]}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {(report.confidence * 100).toFixed(1)}% confidence
                            </Badge>
                          </div>
                          <p className="text-xs mt-2 opacity-90">
                            Case ID: {screeningId ?? "—"} • Risk estimated for age and domain based on reported
                            observations.
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Clinical-style summary</h4>
                          <p className="text-sm text-muted-foreground">{report.summary}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Key findings</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            {report.keyFindings.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Suggestions for next steps</h4>
                          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            {report.recommendations.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Evidence signals</h4>
                          <div className="space-y-2">
                            {report.evidence.map((ev, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50 text-sm"
                              >
                                <span className="font-mono text-xs font-semibold text-primary uppercase">
                                  {ev.type}
                                </span>
                                <span className="flex-1">{ev.content}</span>
                                {ev.influence != null && (
                                  <span className="text-muted-foreground text-xs">
                                    Influence {Math.round(ev.influence * 100)}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Clinician Review tab */}
              <TabsContent value="clinician" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Review queue */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">Review queue (simulated)</h3>
                    <div className="space-y-3">
                      {CLINICIAN_CASES.map((caseItem) => (
                        <div
                          key={caseItem.id}
                          className={cn(
                            "flex flex-wrap justify-between gap-3 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors",
                            selectedCaseId === caseItem.id && "ring-2 ring-primary"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm">
                              {caseItem.id} • {caseItem.childName}
                            </div>
                            <div className="mt-2">
                              <Badge
                                className={cn(
                                  "text-xs",
                                  caseItem.riskLevel === "high"
                                    ? badgeStyles.high
                                    : caseItem.riskLevel === "medium"
                                      ? badgeStyles.medium
                                      : badgeStyles.low
                                )}
                              >
                                {caseItem.riskLevel === "high"
                                  ? "HIGH RISK"
                                  : caseItem.riskLevel === "medium"
                                    ? "Monitor"
                                    : "On track"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{caseItem.summary}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>{caseItem.domain}</strong> • {caseItem.generatedAt}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1"
                            onClick={() => setSelectedCaseId(caseItem.id)}
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Selected case (read-only) */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">Selected case (read-only)</h3>
                    {!selectedCase ? (
                      <p className="text-sm text-muted-foreground">
                        Select a case from the queue to preview how a clinician might see the AI summary and provide
                        sign-off.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div
                          className={cn(
                            "rounded-xl border-l-4 p-4",
                            selectedCase.riskLevel === "high"
                              ? "bg-red-50 border-red-200"
                              : selectedCase.riskLevel === "medium"
                                ? "bg-amber-50 border-amber-200"
                                : "bg-green-50 border-green-200"
                          )}
                        >
                          <div className="font-semibold">Case {selectedCase.id}</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedCase.childName} • {selectedCase.domain}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">AI-generated summary</h4>
                          <p className="text-sm text-muted-foreground">{selectedCase.summary}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Clinician notes (simulated)</h4>
                          <p className="text-sm text-muted-foreground">
                            In a production system, clinicians would review, adjust, and sign off on AI suggestions
                            here.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Integration links: full app flows */}
        <div className="mt-8 p-4 rounded-xl bg-muted/40 border border-border/60">
          <p className="text-sm font-medium text-foreground mb-3">Continue in the full app</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-lg">
              <Link to="/pediscreen/screening">
                <Sparkles className="w-4 h-4" />
                Start full screening
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-lg">
              <Link to="/pediscreen/dashboard">
                <Stethoscope className="w-4 h-4" />
                AI Orchestrator Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-lg">
              <Link to="/clinician/review">
                <Eye className="w-4 h-4" />
                Clinician review queue
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2 rounded-lg text-muted-foreground">
              <Link to="/pediscreen">
                <ArrowLeft className="w-4 h-4" />
                PediScreen Home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
