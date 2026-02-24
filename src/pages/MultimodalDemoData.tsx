/**
 * Multimodal Demo Data — showcases all clinical modalities:
 *   Audio (cry detection, speech), CT scans, Radiology, ROP
 *   with mock analysis results and interactive playback.
 */
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scan, Layers, Volume2, Eye, Play, Pause, AlertTriangle,
  CheckCircle2, Activity, Brain, Baby, Mic, Stethoscope,
  FileImage, Maximize2, X, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Demo Audio Data (synthesized waveform simulation) ────────────
interface AudioDemo {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "cry" | "speech" | "breathing";
  analysis: {
    classification: string;
    confidence: number;
    risk: "normal" | "monitor" | "elevated" | "urgent";
    features: string[];
  };
  spectrogramUrl: string;
}

const AUDIO_DEMOS: AudioDemo[] = [
  {
    id: "cry-pain",
    title: "Pain Cry Detection",
    description: "High-pitched, tense cry pattern with elevated fundamental frequency (F0 > 500 Hz)",
    duration: "0:08",
    type: "cry",
    analysis: {
      classification: "Pain cry — acute distress",
      confidence: 0.94,
      risk: "elevated",
      features: [
        "F0 peak: 612 Hz (elevated)",
        "Cry duration: 3.2s continuous",
        "Dysphonation: present",
        "Melody type: falling",
      ],
    },
    spectrogramUrl: "/images/medical/audio/cry-spectrogram.png",
  },
  {
    id: "cry-hunger",
    title: "Hunger Cry Pattern",
    description: "Rhythmic, low-intensity cry with regular pause intervals",
    duration: "0:12",
    type: "cry",
    analysis: {
      classification: "Hunger cry — normal physiologic",
      confidence: 0.91,
      risk: "normal",
      features: [
        "F0 peak: 380 Hz (normal range)",
        "Cry-pause-cry rhythm: regular",
        "No dysphonation",
        "Melody type: rising-falling",
      ],
    },
    spectrogramUrl: "/images/medical/audio/cry-spectrogram.png",
  },
  {
    id: "speech-delay",
    title: "Speech Sample — 24mo Delay",
    description: "Limited vocabulary, single-word utterances, no word combinations at 24 months",
    duration: "0:15",
    type: "speech",
    analysis: {
      classification: "Expressive language delay",
      confidence: 0.87,
      risk: "monitor",
      features: [
        "Vocabulary estimate: ~10 words (expected: 50+)",
        "No 2-word combinations detected",
        "Prosody: flat (limited intonation variation)",
        "Canonical babbling ratio: 0.3 (expected: >0.6)",
      ],
    },
    spectrogramUrl: "/images/medical/audio/cry-spectrogram.png",
  },
  {
    id: "breathing-stridor",
    title: "Stridor Detection",
    description: "Inspiratory stridor with high-frequency wheezing component",
    duration: "0:06",
    type: "breathing",
    analysis: {
      classification: "Inspiratory stridor — upper airway",
      confidence: 0.89,
      risk: "urgent",
      features: [
        "Stridor frequency: 800-1200 Hz",
        "Inspiratory phase: prolonged",
        "Wheeze-to-breath ratio: 0.6",
        "Suspected: laryngomalacia or croup",
      ],
    },
    spectrogramUrl: "/images/medical/audio/cry-spectrogram.png",
  },
];

// ── Demo Imaging Data ────────────────────────────────────────────
interface ImagingDemo {
  id: string;
  title: string;
  modality: "CT" | "X-Ray" | "ROP" | "Ultrasound";
  imageUrl: string;
  description: string;
  patientInfo: string;
  analysis: {
    finding: string;
    confidence: number;
    risk: "normal" | "monitor" | "elevated" | "urgent";
    details: string[];
    icd10?: string;
  };
}

const IMAGING_DEMOS: ImagingDemo[] = [
  {
    id: "ct-head-normal",
    title: "Head CT — Normal Infant",
    modality: "CT",
    imageUrl: "/images/medical/ct/head-normal.png",
    description: "Axial head CT of a 6-month-old with normal brain anatomy",
    patientInfo: "6mo female, 7.2kg, term delivery",
    analysis: {
      finding: "Normal brain parenchyma",
      confidence: 0.96,
      risk: "normal",
      details: [
        "Ventricles: normal size and configuration",
        "No intracranial hemorrhage or mass",
        "Gray-white matter differentiation: normal",
        "Posterior fossa: unremarkable",
      ],
      icd10: "Z00.129",
    },
  },
  {
    id: "ct-head-ivh",
    title: "Head CT — Grade III IVH",
    modality: "CT",
    imageUrl: "/images/medical/ct/head-ivh.png",
    description: "Preterm infant with intraventricular hemorrhage",
    patientInfo: "28wk GA, 1.1kg, DOL 3",
    analysis: {
      finding: "Grade III Intraventricular Hemorrhage",
      confidence: 0.93,
      risk: "urgent",
      details: [
        "Left germinal matrix hemorrhage with intraventricular extension",
        "Lateral ventricle distension — early hydrocephalus",
        "Periventricular hyperechogenicity",
        "Urgent neurosurgery consultation recommended",
      ],
      icd10: "P52.1",
    },
  },
  {
    id: "xray-chest-normal",
    title: "Chest X-Ray — Normal",
    modality: "X-Ray",
    imageUrl: "/images/medical/radiology/chest-xray-normal.png",
    description: "AP chest radiograph of a 2-year-old, normal findings",
    patientInfo: "2yo male, 12.5kg, well-child visit",
    analysis: {
      finding: "Normal chest radiograph",
      confidence: 0.97,
      risk: "normal",
      details: [
        "Heart size: normal (CTR < 0.55)",
        "Lung fields: clear bilaterally",
        "Costophrenic angles: sharp",
        "No pneumothorax or effusion",
      ],
      icd10: "Z00.129",
    },
  },
  {
    id: "xray-wrist-fracture",
    title: "Wrist X-Ray — Greenstick Fx",
    modality: "X-Ray",
    imageUrl: "/images/medical/radiology/wrist-fracture.png",
    description: "Distal radius greenstick fracture in a 4-year-old",
    patientInfo: "4yo female, 16kg, fall from playground",
    analysis: {
      finding: "Greenstick fracture — distal radius",
      confidence: 0.91,
      risk: "elevated",
      details: [
        "Cortical buckling of the distal radial metaphysis",
        "Slight dorsal angulation (~15°)",
        "No displacement or comminution",
        "Physis: open, no Salter-Harris injury",
      ],
      icd10: "S52.501A",
    },
  },
  {
    id: "xray-abdomen-nec",
    title: "Abdominal X-Ray — NEC",
    modality: "X-Ray",
    imageUrl: "/images/medical/radiology/abdomen-nec.png",
    description: "Neonate with suspected necrotizing enterocolitis",
    patientInfo: "30wk GA, 1.3kg, DOL 14, feeding intolerance",
    analysis: {
      finding: "Pneumatosis intestinalis — Stage IIA NEC",
      confidence: 0.88,
      risk: "urgent",
      details: [
        "Diffuse bowel distension with air-fluid levels",
        "Intramural gas (pneumatosis intestinalis) in LLQ",
        "No free peritoneal air (no perforation)",
        "Bell Stage IIA — NPO, antibiotics, serial KUBs q6h",
      ],
      icd10: "P77.1",
    },
  },
  {
    id: "rop-zone1-stage3",
    title: "ROP — Zone 1 Stage 3+",
    modality: "ROP",
    imageUrl: "/images/medical/rop/zone1/stage3.png",
    description: "Type 1 ROP requiring urgent treatment",
    patientInfo: "26wk GA, 0.8kg, PNA 8wk",
    analysis: {
      finding: "Type 1 ROP — Zone 1 Stage 3 with Plus Disease",
      confidence: 0.94,
      risk: "urgent",
      details: [
        "Neovascularization ridge in Zone 1",
        "Vessel tortuosity and dilation (plus disease)",
        "Extraretinal fibrovascular proliferation",
        "Treatment: anti-VEGF or laser within 48-72h",
      ],
      icd10: "H35.10",
    },
  },
];

// ── Risk badge ───────────────────────────────────────────────────
const RISK_CONFIG = {
  normal: { color: "bg-green-500/10 text-green-700 border-green-500/30", icon: CheckCircle2 },
  monitor: { color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30", icon: Activity },
  elevated: { color: "bg-orange-500/10 text-orange-700 border-orange-500/30", icon: AlertTriangle },
  urgent: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

function RiskBadge({ risk }: { risk: keyof typeof RISK_CONFIG }) {
  const cfg = RISK_CONFIG[risk];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-bold uppercase text-xs", cfg.color)}>
      <Icon className="h-3 w-3" />
      {risk}
    </Badge>
  );
}

// ── Audio Player with waveform visualization ─────────────────────
function AudioDemoCard({ demo }: { demo: AudioDemo }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePlay = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      setProgress(0);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPlaying(false);
            return 0;
          }
          return p + 2;
        });
      }, 150);
    }
  };

  const typeIcon = demo.type === "cry" ? Baby : demo.type === "speech" ? Mic : Stethoscope;
  const TypeIcon = typeIcon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Spectrogram preview */}
          <div className="relative w-full sm:w-48 h-32 sm:h-auto bg-black flex-shrink-0">
            <img
              src={demo.spectrogramUrl}
              alt={`${demo.title} spectrogram`}
              className="w-full h-full object-cover opacity-70"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white" />
              )}
            </button>
            <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none text-[10px]">
              <TypeIcon className="h-3 w-3 mr-1" />
              {demo.duration}
            </Badge>
          </div>

          {/* Details */}
          <div className="flex-1 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-foreground text-sm">{demo.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{demo.description}</p>
              </div>
              <RiskBadge risk={demo.analysis.risk} />
            </div>

            {/* Progress bar */}
            <Progress value={progress} className="h-1.5" />

            {/* Analysis result */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">
                {demo.analysis.classification}
                <span className="text-muted-foreground ml-2">
                  ({(demo.analysis.confidence * 100).toFixed(0)}% confidence)
                </span>
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {demo.analysis.features.map((f, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground flex gap-1">
                    <span className="text-primary">•</span> {f}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Imaging viewer card ──────────────────────────────────────────
function ImagingDemoCard({ demo }: { demo: ImagingDemo }) {
  const [expanded, setExpanded] = useState(false);

  const modalityIcons: Record<string, React.ElementType> = {
    CT: Layers,
    "X-Ray": Scan,
    ROP: Eye,
    Ultrasound: Activity,
  };
  const ModalityIcon = modalityIcons[demo.modality] || Scan;

  return (
    <>
      <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setExpanded(true)}>
        <div className="relative aspect-square bg-black overflow-hidden">
          <img
            src={demo.imageUrl}
            alt={demo.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23111' width='400' height='400'/%3E%3Ctext fill='%23555' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EDemo image%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge className="bg-black/60 text-white border-none text-[10px]">
              <ModalityIcon className="h-3 w-3 mr-1" />
              {demo.modality}
            </Badge>
            <RiskBadge risk={demo.analysis.risk} />
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-white font-bold text-sm">{demo.title}</p>
            <p className="text-white/70 text-[11px]">{demo.patientInfo}</p>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="h-4 w-4 text-white" />
          </div>
        </div>
        <CardContent className="p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">{demo.analysis.finding}</p>
          <p className="text-[11px] text-muted-foreground">
            Confidence: {(demo.analysis.confidence * 100).toFixed(0)}%
            {demo.analysis.icd10 && <> · ICD-10: {demo.analysis.icd10}</>}
          </p>
        </CardContent>
      </Card>

      {/* Expanded modal */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              className="relative max-w-4xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpanded(false)}
                className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="bg-black">
                  <img src={demo.imageUrl} alt={demo.title} className="w-full h-full object-contain max-h-[500px]" />
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[500px]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        <ModalityIcon className="h-3 w-3 mr-1" /> {demo.modality}
                      </Badge>
                      <RiskBadge risk={demo.analysis.risk} />
                    </div>
                    <h2 className="text-xl font-black text-foreground mt-2">{demo.title}</h2>
                    <p className="text-sm text-muted-foreground">{demo.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Patient: {demo.patientInfo}</p>
                  </div>

                  <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      AI Analysis
                    </h3>
                    <p className="text-sm font-semibold text-foreground">{demo.analysis.finding}</p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {(demo.analysis.confidence * 100).toFixed(0)}%
                      {demo.analysis.icd10 && <> · ICD-10: {demo.analysis.icd10}</>}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground text-sm">Findings</h3>
                    <ul className="space-y-1.5">
                      {demo.analysis.details.map((d, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function MultimodalDemoData() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Multimodal Demo Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive clinical audio, CT scans, radiology, and ROP samples with AI-powered mock analysis results.
        </p>
      </div>

      <Tabs defaultValue="imaging" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="imaging" className="gap-1.5">
            <FileImage className="h-4 w-4" />
            Imaging
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-1.5">
            <Volume2 className="h-4 w-4" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="ct" className="gap-1.5">
            <Layers className="h-4 w-4" />
            CT Scans
          </TabsTrigger>
        </TabsList>

        {/* Imaging tab — all modalities */}
        <TabsContent value="imaging" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Scan className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Radiology & ROP</h2>
            <Badge variant="secondary" className="text-xs">{IMAGING_DEMOS.length} samples</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {IMAGING_DEMOS.map((demo) => (
              <ImagingDemoCard key={demo.id} demo={demo} />
            ))}
          </div>
        </TabsContent>

        {/* Audio tab */}
        <TabsContent value="audio" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Clinical Audio Analysis</h2>
            <Badge variant="secondary" className="text-xs">{AUDIO_DEMOS.length} samples</Badge>
          </div>
          <div className="space-y-3">
            {AUDIO_DEMOS.map((demo) => (
              <AudioDemoCard key={demo.id} demo={demo} />
            ))}
          </div>
        </TabsContent>

        {/* CT tab — filtered */}
        <TabsContent value="ct" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">CT Scans</h2>
            <Badge variant="secondary" className="text-xs">
              {IMAGING_DEMOS.filter((d) => d.modality === "CT").length} samples
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {IMAGING_DEMOS.filter((d) => d.modality === "CT").map((demo) => (
              <ImagingDemoCard key={demo.id} demo={demo} />
            ))}
          </div>

          {/* CT metrics card */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-primary" />
                Edge CT Pipeline Metrics
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-foreground">120 MB</p>
                  <p className="text-xs text-muted-foreground">Model size</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">2.1s</p>
                  <p className="text-xs text-muted-foreground">Inference time</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">450 MB</p>
                  <p className="text-xs text-muted-foreground">Peak RAM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        ⚠️ All images and audio are AI-generated demo data for illustration purposes only.
        Not derived from real patient records. Not for clinical use.
      </p>
    </div>
  );
}
