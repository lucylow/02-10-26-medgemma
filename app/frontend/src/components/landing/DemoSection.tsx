import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  Image,
  Cog,
  BarChart3,
  Lightbulb,
  Shield,
  CloudUpload,
  Search,
  CheckCircle,
  AlertTriangle,
  Camera,
  Eye,
  Heart,
  Info,
  ChevronRight,
  Layers,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  DEMO_PRESETS,
  type DemoPresetId,
  MOCK_VISUAL_SAMPLES,
  CHW_WORKFLOW_STEPS,
} from "@/data/demoMockData";
import type { ScreeningResult } from "@/services/screeningApi";

const modelSteps = [
  { icon: Keyboard, label: "Text Input" },
  { icon: Image, label: "Image Analysis" },
  { icon: Cog, label: "MedGemma Inference" },
  { icon: BarChart3, label: "Risk Assessment" },
  { icon: Lightbulb, label: "Recommendations" },
];

const recommendationsData = {
  medium: [
    { strong: "Formal screening:", text: "Complete ASQ-3 or M-CHAT-R for comprehensive assessment" },
    { strong: "Language-rich environment:", text: "Increase interactive reading and narrate daily activities" },
    { strong: "Professional consultation:", text: "Schedule evaluation within 1-2 months" },
    { strong: "Follow-up:", text: "Rescreen in 4-6 weeks to monitor progress" },
  ],
  low: [
    { strong: "Continue monitoring:", text: "Track milestones using CDC's 'Learn the Signs. Act Early.' materials" },
    { strong: "Engage in play:", text: "Provide age-appropriate activities for language, motor, and social skills" },
    { strong: "Routine check-ups:", text: "Continue regular well-child visits for ongoing surveillance" },
    { strong: "Parent education:", text: "Access evidence-based resources on child development" },
  ],
};

// Emotional support messages based on risk level
const supportMessages = {
  medium: {
    title: "We're here to support you 💙",
    message: "Some areas may benefit from a little extra attention. Early awareness means you can help more effectively.",
  },
  low: {
    title: "Your child is doing great! 🌟",
    message: "Development appears healthy. Keep doing what you're doing — your engagement matters!",
  },
  on_track: {
    title: "Your child is doing great! 🌟",
    message: "Development appears healthy. Keep doing what you're doing — your engagement matters!",
  },
  monitor: {
    title: "We're here to support you 💙",
    message: "Some areas may benefit from a little extra attention. Early awareness means you can help more effectively.",
  },
  refer: {
    title: "Support is available 💙",
    message: "Professional evaluation can clarify next steps. Early intervention makes a difference.",
  },
};

const domainOptions = [
  { value: 'communication', label: 'Language & Communication' },
  { value: 'gross_motor', label: 'Gross Motor Skills' },
  { value: 'fine_motor', label: 'Fine Motor Skills' },
  { value: 'social', label: 'Social & Emotional' },
  { value: 'cognitive', label: 'Cognitive / Problem Solving' },
];

export function DemoSection() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [age, setAge] = useState("24");
  const [domain, setDomain] = useState("communication");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "on_track" | "monitor" | "refer">("monitor");
  const [confidence, setConfidence] = useState(0.78);
  const [observation, setObservation] = useState(
    "My 2-year-old says only about 10 words and doesn't seem to combine them. He points to things he wants but doesn't use words. He understands simple instructions like \"come here\" or \"give me the ball.\""
  );
  const [selectedPresetId, setSelectedPresetId] = useState<DemoPresetId | "">("");
  const [reportFromPreset, setReportFromPreset] = useState<ScreeningResult["report"] | null>(null);
  const [chwStepIndex, setChwStepIndex] = useState(0);
  const [visualSampleId, setVisualSampleId] = useState<string | null>(null);

  const handlePresetChange = (value: string) => {
    setSelectedPresetId(value as DemoPresetId | "");
    setReportFromPreset(null);
    setShowResults(false);
    if (value && value !== "custom") {
      const preset = DEMO_PRESETS.find((p) => p.id === value);
      if (preset) {
        setAge(preset.age);
        setDomain(preset.domain);
        setObservation(preset.observations);
      }
    }
  };

  const handleUploadClick = () => {
    toast.info("In the full application, this would open your device camera or gallery to capture visual evidence. For this demo, visual analysis is simulated.", {
      duration: 4000,
    });
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setShowResults(false);
    setReportFromPreset(null);
    setActiveStep(0);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= modelSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 350);

    const preset = selectedPresetId ? DEMO_PRESETS.find((p) => p.id === selectedPresetId) : null;
    const delay = preset ? 1800 : 2000;

    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
      setActiveStep(-1);

      if (preset?.result?.report) {
        setReportFromPreset(preset.result.report);
        const r = preset.result.report;
        setRiskLevel((r.riskLevel as "on_track" | "monitor" | "refer") || "monitor");
        setConfidence(preset.result.confidence ?? 0.78);
      } else {
        const hasDelayIndicators = observation.toLowerCase().includes("only about 10 words") ||
          observation.toLowerCase().includes("doesn't combine");
        const newRiskLevel = age === "24" && hasDelayIndicators ? "medium" : "low";
        const newConfidence = hasDelayIndicators ? 0.82 : 0.91;
        setRiskLevel(newRiskLevel as "low" | "medium");
        setConfidence(newConfidence);
      }
    }, delay);
  };

  // Confidence level indicator config
  const getConfidenceConfig = (conf: number) => {
    if (conf >= 0.85) return { label: 'High Confidence', color: 'text-emerald-500', bg: 'bg-emerald-500' };
    if (conf >= 0.65) return { label: 'Moderate Confidence', color: 'text-amber-500', bg: 'bg-amber-500' };
    return { label: 'Lower Confidence', color: 'text-orange-500', bg: 'bg-orange-500' };
  };

  const confidenceConfig = getConfidenceConfig(confidence);

  return (
    <section id="demo" className="py-20 md:py-28 bg-muted/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="section-title">Interactive Screening Demo</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-8">
            Experience how PediScreen AI works in practice. This simulation shows how 
            MedGemma processes multimodal inputs to provide developmental insights.
          </p>
        </motion.div>

        <Tabs defaultValue="screening" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-card">
            <TabsTrigger value="screening">Developmental Screening</TabsTrigger>
            <TabsTrigger value="visual">Visual Analysis</TabsTrigger>
            <TabsTrigger value="workflow">CHW Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="screening">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-2xl p-6 md:p-10 card-shadow"
            >
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Input Section */}
                <div className="space-y-6">
                  <h3 className="font-heading text-xl font-semibold">
                    Child Information & Observations
                  </h3>

                  <div className="space-y-2">
                    <Label>Try a preset scenario</Label>
                    <Select value={selectedPresetId || "custom"} onValueChange={handlePresetChange}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Write your own..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50">
                        <SelectItem value="custom">Write your own...</SelectItem>
                        {DEMO_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label} — {p.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Child's Age</Label>
                    <Select value={age} onValueChange={setAge}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50">
                        <SelectItem value="18">18 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                        <SelectItem value="36">36 months</SelectItem>
                        <SelectItem value="48">48 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Developmental Domain</Label>
                    <Select value={domain} onValueChange={setDomain}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border z-50">
                        {domainOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Parent's Observations</Label>
                    <Textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Describe your child's behavior..."
                      className="min-h-[120px] bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Visual Evidence (Optional)</Label>
                    <div 
                      onClick={handleUploadClick}
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                      <div className="relative">
                        <CloudUpload className="h-10 w-10 text-muted-foreground mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <Camera className="h-4 w-4 text-primary absolute -right-1 -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-muted-foreground">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        e.g., child's drawing, block tower, play activity
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Analyze with MedGemma
                      </>
                    )}
                  </Button>

                  {/* Model Flow Visualization */}
                  <div className="bg-muted rounded-xl p-6 mt-6">
                    <h4 className="font-heading text-sm font-semibold mb-4 flex items-center gap-2">
                      <Cog className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      On-Device MedGemma Processing
                    </h4>
                    <div className="flex justify-between relative">
                      <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-border" />
                      {/* Animated progress line */}
                      <div 
                        className="absolute top-6 left-[10%] h-0.5 bg-primary transition-all duration-300"
                        style={{ width: activeStep >= 0 ? `${(activeStep / (modelSteps.length - 1)) * 80}%` : '0%' }}
                      />
                      {modelSteps.map((step, index) => (
                        <div key={step.label} className="flex flex-col items-center z-10">
                          <div 
                            className={`w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-md mb-2 transition-all duration-300 ${
                              index <= activeStep ? 'ring-2 ring-primary scale-110' : ''
                            }`}
                          >
                            <step.icon className={`h-5 w-5 transition-colors duration-300 ${
                              index <= activeStep ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <span className={`text-xs text-center transition-colors duration-300 ${
                            index <= activeStep ? 'text-primary font-medium' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-success" />
                      <span>
                        <strong>Privacy First:</strong> All processing happens locally on the device.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Output Section */}
                <div className="lg:border-l lg:pl-12 border-border">
                  <h3 className="font-heading text-xl font-semibold mb-6">
                    MedGemma Analysis Results
                  </h3>

                  {!showResults ? (
                    <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Click "Analyze with MedGemma" to see results</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Risk Indicator with Confidence */}
                      <div className={`rounded-xl p-4 ${
                        (riskLevel === "medium" || riskLevel === "monitor") ? "bg-warning/10" : riskLevel === "refer" ? "bg-destructive/10" : "bg-success/10"
                      }`}>
                        <div className="flex items-start gap-3">
                          {(riskLevel === "medium" || riskLevel === "monitor") ? (
                            <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
                          ) : riskLevel === "refer" ? (
                            <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">
                              {riskLevel === "refer"
                                ? "Refer - Professional evaluation recommended"
                                : (riskLevel === "medium" || riskLevel === "monitor")
                                  ? "Monitor - Some Concerns"
                                  : "On Track - Developing Well"}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              {reportFromPreset?.riskRationale || `Based on analysis of developmental markers for ${age}-month-old child`}
                            </p>
                            
                            {/* Confidence Indicator */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex items-center gap-2 cursor-help">
                                    <Info className={`h-4 w-4 ${confidenceConfig.color}`} />
                                    <span className={`text-xs font-medium ${confidenceConfig.color}`}>
                                      {confidenceConfig.label}
                                    </span>
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${confidence * 100}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className={`h-full rounded-full ${confidenceConfig.bg}`}
                                      />
                                    </div>
                                    <span className={`text-xs font-bold ${confidenceConfig.color}`}>
                                      {Math.round(confidence * 100)}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">
                                    {confidence >= 0.85 
                                      ? "Strong evidence supports this assessment."
                                      : "Reasonably supported. Additional information may help confirm."}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>

                      {/* Emotional Support Message */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`rounded-xl p-4 border-2 ${
                          (riskLevel === "medium" || riskLevel === "monitor")
                            ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100"
                            : riskLevel === "refer"
                              ? "bg-gradient-to-br from-rose-50 to-red-50 border-rose-100"
                              : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Heart className={`h-5 w-5 shrink-0 mt-0.5 ${
                            (riskLevel === "medium" || riskLevel === "monitor") ? "text-amber-500" : riskLevel === "refer" ? "text-rose-500" : "text-emerald-500"
                          }`} />
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">
                              {(supportMessages as Record<string, { title: string; message: string }>)[riskLevel]?.title ?? supportMessages.medium.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(supportMessages as Record<string, { title: string; message: string }>)[riskLevel]?.message ?? supportMessages.medium.message}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Clinical Interpretation */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-heading text-sm font-semibold">
                            Clinical Interpretation
                          </h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            <Eye className="h-3 w-3" />
                            XAI
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {reportFromPreset?.summary ?? `The reported language development for a 24-month-old shows potential delays. While receptive language (understanding) appears within expected range, expressive vocabulary is below the typical 50+ words expected at this age.`}
                        </p>
                      </div>

                      {/* Developmental Markers */}
                      <div>
                        <h4 className="font-heading text-sm font-semibold mb-2">
                          Key Developmental Markers Checked
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {(reportFromPreset?.keyFindings && reportFromPreset.keyFindings.length > 0
                            ? reportFromPreset.keyFindings
                            : [
                                `Vocabulary size (~10 words, expected: 50+ at ${age} months)`,
                                `Word combinations (${(riskLevel === "medium" || riskLevel === "monitor") ? "none" : "emerging"}, expected: emerging at 18-24 months)`,
                                "Following simple instructions (yes, expected: yes)",
                                "Pointing to communicate (yes, expected: established)",
                              ]
                          ).map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className={`h-4 w-4 shrink-0 mt-0.5 ${(riskLevel === "medium" || riskLevel === "monitor" || riskLevel === "refer") ? "text-warning" : "text-success"}`} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-primary/5 rounded-xl p-4">
                        <h4 className="font-heading text-sm font-semibold mb-3">
                          Recommended Next Steps
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {reportFromPreset?.recommendations && reportFromPreset.recommendations.length > 0
                            ? reportFromPreset.recommendations.map((item, idx) => (
                                <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                                  {item}
                                </motion.li>
                              ))
                            : recommendationsData[(riskLevel === "medium" || riskLevel === "monitor") ? "medium" : "low"].map((rec, idx) => (
                                <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                                  <strong>{rec.strong}</strong> {rec.text}
                                </motion.li>
                              ))
                          }
                        </ul>
                      </div>

                      <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                        <strong>Note:</strong> This is a screening tool, not a diagnostic assessment. 
                        Always consult with a healthcare provider for formal evaluation.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="visual">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 md:p-10 card-shadow"
            >
              <h3 className="font-heading text-xl font-semibold mb-2">
                MedGemma Visual Analysis Demo
              </h3>
              <p className="text-muted-foreground mb-6">
                Select a sample image type to see how MedGemma analyzes visual developmental evidence (block towers, drawings, play activities).
              </p>
              <div className="grid gap-4 sm:grid-cols-3 mb-8">
                {MOCK_VISUAL_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setVisualSampleId(visualSampleId === sample.id ? null : sample.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50 ${
                      visualSampleId === sample.id ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <span className="font-medium">{sample.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{sample.description}</p>
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {visualSampleId ? (
                  <motion.div
                    key={visualSampleId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl bg-muted/50 p-6 space-y-4"
                  >
                    {(() => {
                      const sample = MOCK_VISUAL_SAMPLES.find((s) => s.id === visualSampleId);
                      if (!sample) return null;
                      return (
                        <>
                          <h4 className="font-heading font-semibold flex items-center gap-2">
                            <Image className="h-5 w-5" />
                            MedGemma analysis
                          </h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {sample.findings.map((f, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={sample.riskLevel === "on_track" ? "default" : "secondary"}>
                              {sample.riskLevel === "on_track" ? "On track" : sample.riskLevel}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Confidence: {Math.round(sample.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-sm">
                            <strong>Recommendation:</strong> {sample.recommendation}
                          </p>
                        </>
                      );
                    })()}
                  </motion.div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Click a sample above to see mock MedGemma visual analysis results.
                  </p>
                )}
              </AnimatePresence>
            </motion.div>
          </TabsContent>

          <TabsContent value="workflow">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 md:p-10 card-shadow"
            >
              <h3 className="font-heading text-xl font-semibold mb-2">
                Community Health Worker Workflow
              </h3>
              <p className="text-muted-foreground mb-6">
                Step through how CHWs use PediScreen AI in the field with limited connectivity. Click &quot;Next step&quot; to advance.
              </p>
              <div className="space-y-4 max-w-2xl">
                {CHW_WORKFLOW_STEPS.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-4 rounded-xl border-2 p-4 transition-colors ${
                      index <= chwStepIndex ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${
                      index < chwStepIndex ? "bg-primary text-primary-foreground" : index === chwStepIndex ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {index < chwStepIndex ? <CheckCircle className="h-5 w-5" /> : step.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2">
                <Button
                  onClick={() => setChwStepIndex((i) => Math.min(i + 1, CHW_WORKFLOW_STEPS.length - 1))}
                  disabled={chwStepIndex >= CHW_WORKFLOW_STEPS.length - 1}
                  className="gap-2"
                >
                  Next step
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setChwStepIndex(0)}>
                  Reset
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  Step {chwStepIndex + 1} of {CHW_WORKFLOW_STEPS.length}
                </span>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <WifiOff className="h-4 w-4" />
                <span>Offline-first: screenings are stored locally and sync when the device is back online.</span>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
