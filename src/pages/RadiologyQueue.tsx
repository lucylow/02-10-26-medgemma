import React, { useEffect, useState } from "react";
import { RefreshCw, Upload, AlertCircle, BarChart3, Eye } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [expandedExplain, setExpandedExplain] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [queueRes, benchRes] = await Promise.all([
        fetchRadiologyQueue(),
        fetchRadiologyBenchmark().catch(() => null),
      ]);
      setItems(queueRes.items || []);
      setBenchmark(benchRes);
    } catch (e) {
      toast({ title: "Failed to load queue", description: String(e), variant: "destructive" });
      setItems([]);
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

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Upload Study</h2>
        <form onSubmit={handleUpload} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Study ID</label>
            <input
              name="study_id"
              className="h-9 rounded-md border px-3 text-sm"
              placeholder="STUDY-001"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Patient ID</label>
            <input
              name="patient_id"
              className="h-9 rounded-md border px-3 text-sm"
              placeholder="PID-001"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Modality</label>
            <select
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
            <label className="text-xs text-muted-foreground">Image</label>
            <input name="image" type="file" accept="image/*,.dcm" className="text-sm" required />
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
                  No pending studies
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
