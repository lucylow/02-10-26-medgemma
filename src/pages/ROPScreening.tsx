/**
 * ROP Screening page — camera capture → AI analysis → clinical result.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Camera, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CaptureFlow, { type CaptureFlowResult } from "@/components/pediscreen/CaptureFlow";
import { useROPAnalysis, type ROPAnalysisResult } from "@/hooks/useROPAnalysis";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Step = "capture" | "context" | "analyzing" | "result";

const RISK_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  urgent: { bg: "bg-destructive/10 border-destructive", text: "text-destructive", icon: <AlertTriangle className="h-6 w-6" /> },
  threshold: { bg: "bg-orange-500/10 border-orange-500", text: "text-orange-600", icon: <AlertTriangle className="h-6 w-6" /> },
  "pre-threshold": { bg: "bg-yellow-500/10 border-yellow-500", text: "text-yellow-600", icon: <Eye className="h-6 w-6" /> },
  normal: { bg: "bg-green-500/10 border-green-500", text: "text-green-600", icon: <CheckCircle2 className="h-6 w-6" /> },
};

export default function ROPScreening() {
  const [step, setStep] = useState<Step>("capture");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [gaWeeks, setGaWeeks] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [pnaWeeks, setPnaWeeks] = useState("");
  const ropMutation = useROPAnalysis();

  const handleCapture = (result: CaptureFlowResult) => {
    setCapturedImage(result.dataUrl);
    setStep("context");
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    setStep("analyzing");
    try {
      await ropMutation.mutateAsync({
        imageDataUrl: capturedImage,
        gestationalAgeWeeks: gaWeeks ? parseInt(gaWeeks) : undefined,
        birthWeightGrams: birthWeight ? parseInt(birthWeight) : undefined,
        postnatalAgeWeeks: pnaWeeks ? parseInt(pnaWeeks) : undefined,
        caseId: `rop_${Date.now()}`,
      });
      setStep("result");
    } catch {
      setStep("result");
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setGaWeeks("");
    setBirthWeight("");
    setPnaWeeks("");
    ropMutation.reset();
    setStep("capture");
  };

  const result = ropMutation.data;
  const riskStyle = RISK_STYLES[result?.risk_level ?? "normal"] ?? RISK_STYLES.normal;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/pediscreen" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Eye className="h-5 w-5 text-primary" />
          <h1 className="font-bold text-foreground">ROP Screening</h1>
          {result?.is_mock && (
            <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Demo mode</span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Capture */}
          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Capture Retinal Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use a RetCam, smartphone fundoscope adapter, or upload a saved retinal image for ROP analysis.
                  </p>
                  <CaptureFlow onComplete={handleCapture} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Clinical context */}
          {step === "context" && capturedImage && (
            <motion.div key="context" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 items-start">
                    <img src={capturedImage} alt="Captured retinal" className="w-32 h-32 rounded-xl object-cover border border-border" />
                    <div className="flex-1 space-y-3">
                      <h3 className="font-bold text-foreground">Clinical Context (Optional)</h3>
                      <p className="text-xs text-muted-foreground">
                        Adding clinical data improves analysis accuracy.
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">GA (weeks)</Label>
                          <Input value={gaWeeks} onChange={(e) => setGaWeeks(e.target.value)} placeholder="28" type="number" />
                        </div>
                        <div>
                          <Label className="text-xs">Birth weight (g)</Label>
                          <Input value={birthWeight} onChange={(e) => setBirthWeight(e.target.value)} placeholder="1200" type="number" />
                        </div>
                        <div>
                          <Label className="text-xs">PNA (weeks)</Label>
                          <Input value={pnaWeeks} onChange={(e) => setPnaWeeks(e.target.value)} placeholder="6" type="number" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>Back</Button>
                <Button className="flex-1 gap-2" onClick={handleAnalyze}>
                  <Eye className="h-4 w-4" />
                  Analyze for ROP
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Analyzing */}
          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-bold text-foreground">Analyzing retinal image…</p>
              <p className="text-sm text-muted-foreground">Running ROP detection with MedGemma vision model</p>
            </motion.div>
          )}

          {/* Step 4: Result */}
          {step === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">
              {ropMutation.isError ? (
                <Card className="border-destructive">
                  <CardContent className="pt-6 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                    <p className="font-bold text-destructive">Analysis failed</p>
                    <p className="text-sm text-muted-foreground">{ropMutation.error?.message}</p>
                    <Button variant="outline" onClick={handleReset}>Try again</Button>
                  </CardContent>
                </Card>
              ) : result ? (
                <>
                  {/* Risk banner */}
                  <div className={cn("rounded-2xl border-2 p-5 flex items-start gap-4", riskStyle.bg)}>
                    <div className={riskStyle.text}>{riskStyle.icon}</div>
                    <div className="flex-1">
                      <p className={cn("font-black text-xl uppercase", riskStyle.text)}>
                        {result.risk_level}
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        Zone {result.zone} · Stage {result.stage}
                        {result.plus_disease && " · Plus Disease"}
                        {result.aggressive_posterior && " · AP-ROP"}
                      </p>
                      <p className="text-sm font-semibold text-muted-foreground mt-1">
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Urgency */}
                  {result.urgency_hours && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3">
                      <Clock className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-bold text-destructive">
                        Treatment recommended within {result.urgency_hours} hours
                      </p>
                    </div>
                  )}

                  {/* Findings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-primary" />
                        Findings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.findings?.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Recommendation */}
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-bold text-foreground mb-2">Recommendation</h3>
                      <p className="text-sm text-muted-foreground">{result.recommendation}</p>
                      {result.icd10 && (
                        <p className="text-xs text-muted-foreground/70 mt-3">ICD-10: {result.icd10}</p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={handleReset} className="gap-2">
                      <Camera className="h-4 w-4" />
                      New Screening
                    </Button>
                  </div>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground/60 text-center px-4">
          ⚠️ This tool is intended to assist — not replace — clinical judgment. All ROP findings must be confirmed by a qualified ophthalmologist. Not FDA-cleared for diagnostic use.
        </p>
      </main>
    </div>
  );
}
