import React, { useCallback, useMemo, useState } from "react";
import { Upload, PlayCircle, CheckCircle2, AlertCircle, Cpu, FileImage, Brain, Share2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ctPreprocess,
  ctInfer,
  CTAnatomy,
  CTPreprocessResponse,
  CTInferResponse,
} from "@/services/ctApi";

type PipelineStepId = "select" | "preprocess" | "infer" | "visualize" | "export";

interface PipelineStep {
  id: PipelineStepId;
  label: string;
  description: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "select",
    label: "DICOM import",
    description: "Select a portable CT DICOM or NIfTI series (head, chest, abdomen, extremity).",
  },
  {
    id: "preprocess",
    label: "Preprocess",
    description: "Normalize Hounsfield units and prepare a 3D volume for edge inference.",
  },
  {
    id: "infer",
    label: "MedGemma 3D inference",
    description: "Run quantized MedGemma-2B-IT-Q4 on 3D patches to produce CT findings.",
  },
  {
    id: "visualize",
    label: "3D mesh / MPR",
    description: "Render 3D meshes and multiplanar reconstructions for clinician review.",
  },
  {
    id: "export",
    label: "FHIR export",
    description: "Export findings and optional 3D mesh as a FHIR Bundle R4.",
  },
];

type PipelineStatus = "idle" | "running" | "complete" | "error";

function filesToBase64(files: File[]): Promise<string> {
  const blob = new Blob(files, { type: "application/octet-stream" });
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  });
}

function statusForStep(
  stepId: PipelineStepId,
  currentStep: PipelineStepId,
  pipelineStatus: PipelineStatus
): PipelineStatus {
  if (pipelineStatus === "error") return "error";
  const order = PIPELINE_STEPS.map((s) => s.id);
  const currentIndex = order.indexOf(currentStep);
  const stepIndex = order.indexOf(stepId);
  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return pipelineStatus === "idle" ? "idle" : "running";
  return "idle";
}

function stepProgress(currentStep: PipelineStepId): number {
  const index = PIPELINE_STEPS.findIndex((s) => s.id === currentStep);
  if (index < 0) return 0;
  const fraction = (index + 1) / PIPELINE_STEPS.length;
  return Math.round(fraction * 100);
}

interface CT3DMeshPipelineProps {
  className?: string;
}

export const CT3DMeshPipeline: React.FC<CT3DMeshPipelineProps> = ({ className }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [anatomy, setAnatomy] = useState<CTAnatomy>("head");
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [currentStep, setCurrentStep] = useState<PipelineStepId>("select");
  const [preprocessResp, setPreprocessResp] = useState<CTPreprocessResponse | null>(null);
  const [inferResp, setInferResp] = useState<CTInferResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasResults = !!inferResp || !!preprocessResp;

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      setFiles(selected);
      setError(null);
      setPreprocessResp(null);
      setInferResp(null);
      setPipelineStatus(selected.length ? "idle" : "idle");
      setCurrentStep("select");
    },
    []
  );

  const handleRunPipeline = useCallback(async () => {
    if (!files.length) {
      setError("Select at least one DICOM or NIfTI file to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPipelineStatus("running");
    setCurrentStep("preprocess");

    try {
      const volume_b64 = await filesToBase64(files);
      const preprocess = await ctPreprocess({ volume_b64, anatomy });
      setPreprocessResp(preprocess);

      if (!preprocess.volume_id) {
        throw new Error("Preprocess succeeded but did not return a volume_id.");
      }

      setCurrentStep("infer");
      const inference = await ctInfer({ volume_id: preprocess.volume_id, anatomy });
      setInferResp(inference);

      setCurrentStep("export");
      setPipelineStatus("complete");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected error while running CT 3D pipeline.";
      setError(message);
      setPipelineStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }, [anatomy, files]);

  const progressValue = useMemo(() => stepProgress(currentStep), [currentStep]);

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]", className)}>
      <Card className="border-dashed">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">DICOM → 3D mesh pipeline</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Import a portable CT DICOM stack, preprocess it on-device or on your edge workstation, and
            run MedGemma 3D inference via the PediScreen backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="ct3d-file-input"
            >
              CT study files (512×512×N DICOM stack or NIfTI)
            </label>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => document.getElementById("ct3d-file-input")?.click()}
              >
                <Upload className="w-4 h-4" />
                {files.length ? `${files.length} file(s) selected` : "Select DICOM / NIfTI files"}
              </Button>
              <input
                id="ct3d-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept=".dcm,.nii,.nii.gz,application/dicom,application/octet-stream"
              />
              <p className="text-[11px] text-muted-foreground">
                Typical portable CT: 512×512×300 head CT (~150–500 MB, 200–1500 slices).
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Anatomy / protocol
              </p>
              <Select
                value={anatomy}
                onValueChange={(value) => setAnatomy(value as CTAnatomy)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select anatomy" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="head">Head (preemie IVH, brain)</SelectItem>
                  <SelectItem value="chest">Chest</SelectItem>
                  <SelectItem value="abdomen">Abdomen</SelectItem>
                  <SelectItem value="pelvis">Pelvis</SelectItem>
                  <SelectItem value="extremity">Extremity (fracture)</SelectItem>
                  <SelectItem value="spine">Spine</SelectItem>
                  <SelectItem value="wbct">WBCT / pedCAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Edge target (example)
              </p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5">
                  <Cpu className="w-3 h-3" />
                  iPhone 16 / S25 Ultra
                </Badge>
                <Badge variant="secondary" className="gap-1 rounded-full px-2 py-0.5">
                  2.1 s full pipeline
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="w-full sm:w-2/3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Pipeline progress</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} />
            </div>
            <Button
              type="button"
              className="gap-2 whitespace-nowrap"
              disabled={isSubmitting || !files.length}
              onClick={handleRunPipeline}
            >
              <PlayCircle className="w-4 h-4" />
              {isSubmitting ? "Running…" : "Run CT 3D pipeline"}
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <p className="text-[11px] text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2 space-y-1">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Pipeline stages</CardTitle>
            </div>
            <CardDescription className="text-[11px]">
              Mirrors the Edge AI Prize pipeline: DICOM import → 3D mesh extraction → MedGemma IVH /
              fracture / abdominal risk scores → FHIR export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {PIPELINE_STEPS.map((step) => {
              const status = statusForStep(step.id, currentStep, pipelineStatus);
              const isComplete = status === "complete";
              const isRunning = status === "running";
              const isError = status === "error";
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-2 py-1.5",
                    isComplete && "border-emerald-500/60 bg-emerald-500/5",
                    isRunning && "border-primary/60 bg-primary/5",
                    isError && "border-destructive/60 bg-destructive/5"
                  )}
                >
                  <div className="mt-0.5">
                    {isError ? (
                      <AlertCircle className="w-3 h-3 text-destructive" />
                    ) : (
                      <CheckCircle2
                        className={cn(
                          "w-3 h-3",
                          isComplete || isRunning
                            ? "text-primary"
                            : "text-muted-foreground/40"
                        )}
                      />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={cn("border-dashed", !hasResults && "opacity-80")}>
          <CardHeader className="pb-2 space-y-1">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">CT 3D findings & export</CardTitle>
            </div>
            <CardDescription className="text-[11px]">
              Once the backend is wired, this section surfaces MedGemma 3D findings, risk tiers, and
              FHIR export handles from the CT APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-[11px] text-muted-foreground">
            {!hasResults && (
              <p>
                Run the pipeline with a sample portable CT study to populate findings and FHIR export
                details. This mirrors the on-device React Native pipeline using ITK-Wasm and
                Marching Cubes for 3D mesh extraction.
              </p>
            )}
            {preprocessResp && (
              <div className="space-y-1">
                <p className="font-semibold text-foreground/80 text-xs">Preprocess metadata</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {preprocessResp.metadata?.shape && (
                    <div>
                      <span className="font-medium text-foreground/70">Volume shape:</span>{" "}
                      <span>
                        {preprocessResp.metadata.shape[0]}×{preprocessResp.metadata.shape[1]}×
                        {preprocessResp.metadata.shape[2]}
                      </span>
                    </div>
                  )}
                  {preprocessResp.metadata?.spacing_mm && (
                    <div>
                      <span className="font-medium text-foreground/70">Voxel spacing (mm):</span>{" "}
                      <span>
                        {preprocessResp.metadata.spacing_mm[0].toFixed(2)}×
                        {preprocessResp.metadata.spacing_mm[1].toFixed(2)}×
                        {preprocessResp.metadata.spacing_mm[2].toFixed(2)}
                      </span>
                    </div>
                  )}
                  {preprocessResp.patch_count != null && (
                    <div>
                      <span className="font-medium text-foreground/70">Patch count:</span>{" "}
                      <span>{preprocessResp.patch_count}</span>
                    </div>
                  )}
                  {preprocessResp.metadata?.slice_count != null && (
                    <div>
                      <span className="font-medium text-foreground/70">Slice count:</span>{" "}
                      <span>{preprocessResp.metadata.slice_count}</span>
                    </div>
                  )}
                  {preprocessResp.volume_id && (
                    <div className="col-span-2">
                      <span className="font-medium text-foreground/70">Volume ID:</span>{" "}
                      <span className="font-mono break-all">
                        {preprocessResp.volume_id}
                      </span>
                    </div>
                  )}
                  {preprocessResp.message && (
                    <div className="col-span-2">
                      <span className="font-medium text-foreground/70">Backend:</span>{" "}
                      <span>{preprocessResp.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {inferResp && (
              <div className="space-y-1">
                <p className="font-semibold text-foreground/80 text-xs">MedGemma 3D findings</p>
                <div className="grid gap-1">
                  {inferResp.findings?.length ? (
                    inferResp.findings.map((f) => (
                      <div
                        key={`${f.label}-${f.region ?? "global"}`}
                        className="flex items-start justify-between rounded-md border px-2 py-1"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium">{f.label}</p>
                          {f.region && (
                            <p className="text-[11px] text-muted-foreground">
                              Region: {f.region}
                            </p>
                          )}
                        </div>
                        {typeof f.confidence === "number" && (
                          <span className="text-[11px] font-medium text-foreground/80">
                            {(f.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No structured findings returned from CT 3D inference.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                  {inferResp.risk_tier && (
                    <div>
                      <span className="font-medium text-foreground/70">Risk tier:</span>{" "}
                      <span>{inferResp.risk_tier}</span>
                    </div>
                  )}
                  {inferResp.inference_time_seconds != null && (
                    <div>
                      <span className="font-medium text-foreground/70">Inference time:</span>{" "}
                      <span>{inferResp.inference_time_seconds.toFixed(2)} s</span>
                    </div>
                  )}
                  {inferResp.fhir_bundle_id && (
                    <div className="col-span-2">
                      <span className="font-medium text-foreground/70">FHIR bundle:</span>{" "}
                      <span className="font-mono break-all">
                        {inferResp.fhir_bundle_id}
                      </span>
                    </div>
                  )}
                  {inferResp.message && (
                    <div className="col-span-2">
                      <span className="font-medium text-foreground/70">Backend:</span>{" "}
                      <span>{inferResp.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

