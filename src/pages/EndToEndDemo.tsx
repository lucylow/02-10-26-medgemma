import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, FileText, CheckCircle, Loader2, Download, Pencil } from "lucide-react";

interface DraftReport {
  report_id: string;
  clinical_summary?: string;
  technical_summary?: string;
  parent_summary?: string;
  recommendations?: string[];
  domains?: { domain: string; rating: string; rationale: string }[];
  icd_codes?: string[];
  status?: string;
  _fallback?: boolean;
}

export default function EndToEndDemo() {
  const [screeningId, setScreeningId] = useState("s-demo-1");
  const [age, setAge] = useState(24);
  const [scores, setScores] = useState('{"communication":0.3,"motor":0.8}');
  const [obs, setObs] = useState(
    "He only says about 10 words and points rather than using words."
  );
  const [draft, setDraft] = useState<DraftReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "draft" | "finalized">("input");
  const [clinicianNote, setClinicianNote] = useState("");
  const [patchLoading, setPatchLoading] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("screening_id", screeningId);
      fd.append("age_months", String(age));
      fd.append("scores_json", scores);
      fd.append("observations", obs);

      const { data, error } = await supabase.functions.invoke("end2end-report", {
        body: fd,
      });

      if (error) throw new Error(error.message);
      setDraft(data);
      setStep("draft");
      toast.success("Draft generated", { description: data.report_id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Generation failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handlePatch() {
    if (!draft) return;
    setPatchLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/end2end-report/reports/${draft.report_id}/patch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            clinical_summary: draft.clinical_summary + "\n\n(Edited by clinician.)",
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || "Patch failed");

      setDraft(result.updated_draft);
      toast.success("Edits saved");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Patch failed", { description: msg });
    } finally {
      setPatchLoading(false);
    }
  }

  async function handleFinalize() {
    if (!draft) return;
    setFinalizeLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/end2end-report/reports/${draft.report_id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ clinician_note: clinicianNote }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || "Finalize failed");

      if (result.ok && result.pdf_base64) {
        const link = document.createElement("a");
        link.href = "data:text/plain;base64," + result.pdf_base64;
        link.download = `${draft.report_id}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setStep("finalized");
        toast.success("Report finalized & downloaded");
      } else {
        toast.error("Finalize failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Finalize failed", { description: msg });
    } finally {
      setFinalizeLoading(false);
    }
  }

  const ratingColor = (r: string) => {
    if (r === "on_track") return "bg-green-100 text-green-800 border-green-300";
    if (r === "monitor") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">End-to-End AI Report Demo</h1>
        {draft?._fallback && <Badge variant="outline" className="text-yellow-700 border-yellow-400">Mock Fallback</Badge>}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === "input" ? "default" : "secondary"}>1. Input</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={step === "draft" ? "default" : "secondary"}>2. Draft Review</Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant={step === "finalized" ? "default" : "secondary"}>3. Finalized</Badge>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Screening Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="e2e-screening-id">Screening ID</Label>
              <Input id="e2e-screening-id" value={screeningId} onChange={(e) => setScreeningId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e2e-age">Age (months)</Label>
              <Input id="e2e-age" type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e2e-scores">Scores JSON</Label>
            <Input id="e2e-scores" value={scores} onChange={(e) => setScores(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e2e-obs">Observations</Label>
            <Textarea id="e2e-obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating with AI…</> : <><FileText className="mr-2 h-4 w-4" /> Generate Draft</>}
          </Button>
        </CardContent>
      </Card>

      {/* Draft Preview */}
      {draft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Draft Preview
              <Badge variant={draft.status === "finalized" ? "default" : "outline"}>
                {draft.status || "draft"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Clinical Summary</h4>
              <p className="text-sm">{draft.clinical_summary}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Technical Summary</h4>
              <p className="text-sm">{draft.technical_summary}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Parent-Friendly Summary</h4>
              <p className="text-sm">{draft.parent_summary}</p>
            </div>

            {draft.domains && draft.domains.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Domain Ratings</h4>
                  <div className="flex flex-wrap gap-2">
                    {draft.domains.map((d, i) => (
                      <Badge key={i} variant="outline" className={ratingColor(d.rating)}>
                        {d.domain}: {d.rating}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {draft.recommendations && draft.recommendations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Recommendations</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {draft.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </>
            )}

            {draft.icd_codes && draft.icd_codes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">ICD-10 Codes</h4>
                  <div className="flex gap-2">
                    {draft.icd_codes.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="e2e-clinician-note">Clinician Note (for sign-off)</Label>
              <Input
                id="e2e-clinician-note"
                value={clinicianNote}
                onChange={(e) => setClinicianNote(e.target.value)}
                placeholder="Reviewed and approved. SLP referral placed."
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePatch} disabled={patchLoading || step === "finalized"}>
                {patchLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                Edit & Save
              </Button>
              <Button onClick={handleFinalize} disabled={finalizeLoading || step === "finalized"}>
                {finalizeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Finalize & Download
              </Button>
            </div>

            {step === "finalized" && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Report finalized and signed.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
