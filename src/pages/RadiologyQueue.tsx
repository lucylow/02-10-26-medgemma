import React, { useEffect, useState } from "react";
import { RefreshCw, Upload, AlertCircle, BarChart3, Eye, Scan, Cpu, Layers, Video, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchRadiologyQueue,
  uploadRadiologyStudy,
  reviewStudy,
  fetchRadiologyBenchmark,
  type RadiologyStudy,
  type RadiologyBenchmark,
} from "@/services/radiologyApi";
import ExplainabilityHeatmap from "@/components/radiology/ExplainabilityHeatmap";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<string, string> = {
  stat: "bg-red-500/90 text-white border-red-600",
  urgent: "bg-amber-500/90 text-white border-amber-600",
  routine: "bg-slate-500/80 text-white border-slate-600",
};

const CT_METRICS = {
  modelSizeMb: 120,
  inferenceSeconds: 2.1,
  peakRamMb: 450,
};

function PriorityBadge({ label }: { label: string }) {
  const c = PRIORITY_COLORS[label?.toLowerCase()] || "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("font-bold uppercase", c)}>
      {label || "—"}
    </Badge>
  );
}

export default function RadiologyQueue() {
  const [items, setItems] = useState<RadiologyStudy[]>([]);
  const [benchmark, setBenchmark] = useState<RadiologyBenchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [expandedExplain, setExpandedExplain] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [queueRes, benchRes] = await Promise.all([
        fetchRadiologyQueue(),
        fetchRadiologyBenchmark().catch(() => null),
      ]);
      setItems(queueRes.items || []);
      setBenchmark(benchRes);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setLoadError(message);
      setItems([]);
      setBenchmark(null);
      toast({ title: "Failed to load queue", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const studyId = (form.elements.namedItem("study_id") as HTMLInputElement)?.value;
    const patientId = (form.elements.namedItem("patient_id") as HTMLInputElement)?.value;
    const modality = (form.elements.namedItem("modality") as HTMLInputElement)?.value || "XR";
    const fileInput = form.elements.namedItem("image") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!studyId || !patientId || !file) {
      toast({ title: "Missing fields", description: "Study ID, Patient ID, and image are required.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadRadiologyStudy(studyId, patientId, modality, file);
      toast({ title: "Study uploaded", description: `Priority: ${res.priority}. ${res.note}` });
      form.reset();
      load();
    } catch (e) {
      toast({ title: "Upload failed", description: String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async (studyId: string, priority: "stat" | "urgent" | "routine") => {
    setReviewing(studyId);
    try {
      await reviewStudy(studyId, priority);
      toast({ title: "Reviewed", description: `Study ${studyId} marked as ${priority}` });
      load();
    } catch (e) {
      toast({ title: "Review failed", description: String(e), variant: "destructive" });
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Radiology Worklist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-assisted triage; clinician review required
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* CT 3D & Edge overview — portable CT scanners frontend */}
      <div className="rounded-lg border bg-card/70 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scan className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">CT 3D &amp; Edge — Portable CT Scanners</h2>
              <p className="text-xs text-muted-foreground">
                3D pediatric CT volumes (512×512×N voxels, 100–500&nbsp;MB DICOM) streamed into MedGemma-2B-IT-Q4 for fully offline triage.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-background">
              <Cpu className="w-3 h-3 text-primary" />
              <span>Edge-only (no cloud)</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-background">
              <Award className="w-3 h-3 text-primary" />
              <span>Edge AI Prize-ready</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              CT volume characteristics
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Raw DICOM: 100–500&nbsp;MB (chest / abdomen / pelvis)</li>
              <li>• Voxel spacing: 0.5&nbsp;mm × 0.5&nbsp;mm × 1–5&nbsp;mm</li>
              <li>• Hounsfield: -1000 (air) → +3000 (bone), 16‑bit depth</li>
              <li>• Typical stack: 200–1500 slices per study</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Edge pipeline (DICOM → MedGemma)
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-start gap-2">
                <Layers className="w-3 h-3 mt-0.5 text-primary" />
                <p>[DICOM stack 512×512×N] → NIfTI + Hounsfield normalization (-1000..+3000 → 0..1)</p>
              </div>
              <div className="flex items-start gap-2">
                <Cpu className="w-3 h-3 mt-0.5 text-primary" />
                <p>EdgeAiEngine: 3D patch extraction (64×64×64) + batching for MedGemma-2B-IT-Q4 (120&nbsp;MB quantized)</p>
              </div>
              <div className="flex items-start gap-2">
                <Scan className="w-3 h-3 mt-0.5 text-primary" />
                <p>Local 3D inference (~{CT_METRICS.inferenceSeconds}s/organ) → CT findings + tiered risk scores</p>
              </div>
              <div className="flex items-start gap-2">
                <Video className="w-3 h-3 mt-0.5 text-primary" />
                <p>FHIR R4 bundle + 3D visualization (multiplanar + volume render) for clinician review</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Portable CT targets &amp; metrics
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Mobile CT (Canon Aquilion Go, Siemens Go.Top) — preemie IVH / head CT</li>
              <li>• Cone‑beam CT — pediatric dental / airway adjunct</li>
              <li>• pedCAT / extremity CT — fractures, scoliosis, foot‑ankle WBCT</li>
            </ul>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border bg-background px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">Model</p>
                <p className="text-xs font-semibold">{CT_METRICS.modelSizeMb} MB</p>
              </div>
              <div className="rounded-md border bg-background px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">Latency</p>
                <p className="text-xs font-semibold">{CT_METRICS.inferenceSeconds}s / volume</p>
              </div>
              <div className="rounded-md border bg-background px-2 py-1.5">
                <p className="text-[10px] text-muted-foreground">Peak RAM</p>
                <p className="text-xs font-semibold">{CT_METRICS.peakRamMb} MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/40 mt-2">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pediatric CT use cases (Edge AI)
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Preemie IVH (CT head): Grade I–IV hemorrhage risk, hydrocephalus monitoring.</li>
              <li>• Pediatric fractures: 0.2&nbsp;mm multiplanar reconstructions for complex joints.</li>
              <li>• Abdominal emergencies: appendicitis vs NEC with multi‑organ risk stratification.</li>
              <li>• Oncology staging: neuroblastoma, Wilms tumor, lymphoma — 3D tumor volume tracking.</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Edge AI Prize demo storyline
            </p>
            <p className="text-xs text-muted-foreground">
              3‑minute flow: CHW loads portable CT in the PediScreen UI → DICOM/NIfTI import →
              ~{CT_METRICS.inferenceSeconds}s on‑device CT inference → 4‑tier risk dashboard →
              multiplanar 3D render → offline FHIR R4 export (e.g. AirDrop) to pediatric specialist →
              serial CT comparison for progression tracking.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Upload Study</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rad-study-id" className="text-xs text-muted-foreground">Study ID</label>
            <input
              id="rad-study-id"
              name="study_id"
              className="h-9 rounded-md border px-3 text-sm"
              placeholder="STUDY-001"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rad-patient-id" className="text-xs text-muted-foreground">Patient ID</label>
            <input
              id="rad-patient-id"
              name="patient_id"
              className="h-9 rounded-md border px-3 text-sm"
              placeholder="PID-001"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rad-modality" className="text-xs text-muted-foreground">Modality</label>
            <select
              id="rad-modality"
              name="modality"
              className="h-9 rounded-md border px-3 text-sm w-28"
              defaultValue="XR"
            >
              <option value="XR">XR</option>
              <option value="CT">CT</option>
              <option value="MR">MR</option>
              <option value="US">US</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rad-image" className="text-xs text-muted-foreground">Image</label>
            <input id="rad-image" name="image" type="file" accept="image/*,.dcm" className="text-sm" required />
          </div>
          <Button type="submit" disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </div>

      {benchmark && items.length > 0 && (
        <div className="rounded-lg border bg-card p-4 flex items-center gap-6">
          <BarChart3 className="w-8 h-8 text-primary" />
          <div>
            <h3 className="text-sm font-medium">Time-to-Read Benchmark</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prioritized queue vs baseline (all routine):{" "}
              <span className="font-semibold text-foreground">
                {benchmark.reduction_percent}% reduction
              </span>{" "}
              ({benchmark.baseline_avg_minutes} min → {benchmark.prioritized_avg_minutes} min avg)
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {loadError && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-destructive/10 border-b text-sm">
            <div>
              <p className="font-medium text-destructive">Queue unavailable</p>
              <p className="text-muted-foreground mt-0.5">
                {loadError.includes("Backend unreachable") || loadError.includes("fetch")
                  ? "The radiology backend may not be running or not configured for this deployment. Set VITE_PEDISCREEN_BACKEND_URL to your backend URL, or retry when the backend is available."
                  : loadError}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Retry
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            AI suggestions are not diagnoses. Override and finalize as needed. Clinical decision support only — qualified clinician review required.
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Study</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>AI Summary</TableHead>
              <TableHead className="w-20">Explain</TableHead>
              <TableHead className="text-right">Override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {loadError ? "Queue could not be loaded. Use Retry above or check backend configuration." : "No pending studies"}
                </TableCell>
              </TableRow>
            ) : (
              items.map((i) => (
                <React.Fragment key={i.study_id}>
                <TableRow>
                  <TableCell>
                    <PriorityBadge label={i.override_priority || i.priority_label} />
                  </TableCell>
                  <TableCell className="font-medium">{i.study_id}</TableCell>
                  <TableCell>{i.patient_id}</TableCell>
                  <TableCell>{i.modality}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {i.ai_summary || "—"}
                  </TableCell>
                  <TableCell>
                    {(i as RadiologyStudy & { has_explainability?: boolean }).has_explainability ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() =>
                          setExpandedExplain(
                            expandedExplain === i.study_id ? null : i.study_id
                          )
                        }
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {i.status === "pending" ? (
                      <Select
                        onValueChange={(v) => handleReview(i.study_id, v as "stat" | "urgent" | "routine")}
                        disabled={reviewing === i.study_id}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue placeholder="Override" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stat">STAT</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="routine">Routine</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">Reviewed</span>
                    )}
                  </TableCell>
                </TableRow>
                {expandedExplain === i.study_id &&
                  (i as RadiologyStudy & { has_explainability?: boolean }).has_explainability && (
                    <TableRow key={`${i.study_id}-explain`}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <ExplainabilityHeatmap studyId={i.study_id} className="mt-4" />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
