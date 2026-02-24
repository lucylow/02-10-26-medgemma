/**
 * CT 3D & Edge — Portable CT Scanners integration with PediScreen AI.
 * 3D imaging (DICOM/NIfTI) → EdgeAiEngine → MedGemma-2B-IT-Q4 for offline pediatric analysis.
 */
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Cpu,
  Layers,
  Scan,
  Stethoscope,
  Timer,
  Gauge,
  ArrowRight,
} from "lucide-react";

const CT_METRICS = { modelMb: 120, inferenceSec: 2.1, peakRamMb: 450 };

const hardwareTargets = [
  {
    title: "AI-enabled mobile CT",
    subtitle: "Canon Aquilion Go, Siemens Go.Top",
    bullets: [
      "MedGemma-2B-IT-Q4 120MB runs fully offline on portable CT workstations.",
      "~2.1 s organ-level inference per 3D volume; preemie IVH / head CT focus.",
    ],
    badge: "Portable CT",
  },
  {
    title: "Cone-beam CT",
    subtitle: "Dental / airway adjunct",
    bullets: [
      "8 cm FOV for mandible, TMJ, upper airway; 3D feeds into PediScreen risk narratives.",
    ],
    badge: "CBCT",
  },
  {
    title: "Handheld / pedCAT",
    subtitle: "Field & extremity WBCT",
    bullets: [
      "EdgeAiEngine handles varying voxel spacing; fractures, scoliosis, foot-ankle WBCT.",
    ],
    badge: "Edge",
  },
];

const useCases = [
  { title: "Preemie IVH", desc: "CT head Grade I–IV hemorrhage and hydrocephalus risk; ~2.1 s full-brain inference." },
  { title: "Pediatric fractures", desc: "0.2 mm MPR for complex joints; ASQ-3 motor correlation." },
  { title: "Abdominal emergencies", desc: "Appendicitis vs NEC; multi-organ risk stratification." },
  { title: "Oncology staging", desc: "Neuroblastoma, Wilms, lymphoma; 3D tumor volume and FHIR export." },
];

export default function CT3DEdge() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          <Scan className="w-4 h-4" />
          <span>CT 3D Edge Integration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Portable CT scanners — Edge AI for pediatric 3D imaging
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          CT scanners produce 512×512×N voxel DICOM stacks (100–500 MB). PediScreen CT uses
          MedGemma-2B-IT-Q4 to process volumes locally and fuse 3D findings into the same
          HAI-DEF agent ecosystem as developmental screening.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Cpu className="w-3 h-3" />
            {CT_METRICS.modelMb} MB MedGemma-2B-IT-Q4
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Timer className="w-3 h-3" />
            ~{CT_METRICS.inferenceSec} s per organ volume
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Gauge className="w-3 h-3" />
            {CT_METRICS.peakRamMb} MB peak RAM
          </Badge>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Portable CT hardware targets</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hardwareTargets.map((target) => (
            <Card key={target.title} className="border shadow-sm h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CardTitle className="text-base">{target.title}</CardTitle>
                  <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5">
                    {target.badge}
                  </Badge>
                </div>
                <CardDescription className="text-xs">{target.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 space-y-2 text-xs text-muted-foreground flex-1">
                {target.bullets.map((line) => (
                  <p key={line}>• {line}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">DICOM → EdgeAiEngine → MedGemma 3D pipeline</h2>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-4 grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <p className="font-medium mb-1">1. DICOM ingest</p>
              <p className="text-xs text-muted-foreground">
                512×512×N stacks, Hounsfield -1000..+3000, 200–1500 slices.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium mb-1">2. EdgeAiEngine preprocess</p>
              <p className="text-xs text-muted-foreground">
                NIfTI, Hounsfield→[0,1], 64×64×64 patches.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium mb-1">3. MedGemma 3D inference</p>
              <p className="text-xs text-muted-foreground">
                On-device inference → findings + FHIR R4 + 3D visualization.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Pediatric CT use cases</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map((uc) => (
            <Card key={uc.title} className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{uc.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 text-xs text-muted-foreground">
                {uc.desc}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium text-primary">Radiology worklist & CT upload</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload studies (XR, CT, MR, US), triage by AI priority, and review with explainability.
              </p>
            </div>
            <Link to="/pediscreen/radiology">
              <Button className="gap-2">
                Open Radiology Worklist
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
