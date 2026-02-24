/**
 * Integrations hub — Smart Home, MRI, CT, Pathology, OpenVINO, voice.
 */
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Home,
  Scan,
  Brain,
  Microscope,
  Cpu,
  Mic,
  ArrowRight,
  ExternalLink,
  FlaskConical,
  TestTubes,
  Activity,
  Stethoscope,
  ImageIcon,
  Shield,
} from "lucide-react";

const integrations = [
  {
    title: "Smart Home / Baby Cam",
    description: "Passive motor surveillance from Nest Cam, Ring, Nanit Pro. Edge pose → BIMS scoring. Raw video stays on device.",
    icon: Home,
    path: "/pediscreen/screening",
    doc: "Smart Home API: POST /api/smart_home/motor_analysis",
    color: "from-amber-500/20 to-amber-500/5",
  },
  {
    title: "Pediatric MRI",
    description: "3D volumetric (T1/T2/DTI). Brain age, risk fusion with PediScreen prior. DICOM/NIfTI → GLTF export.",
    icon: Brain,
    path: "/pediscreen/radiology",
    doc: "POST /api/mri/analyze, POST /api/mri/export-nifti",
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    title: "CT 3D & Edge",
    description: "Portable CT, cone-beam, pedCAT WBCT. Preprocess & infer for head, chest, extremity, oncology.",
    icon: Scan,
    path: "/pediscreen/ct-3d",
    doc: "POST /api/ct/preprocess, POST /api/ct/infer",
    color: "from-violet-500/20 to-violet-500/5",
  },
  {
    title: "Digital Pathology",
    description: "WSI and patch analysis. Screening-to-pathology continuum for oncology and rare disease.",
    icon: Microscope,
    path: "/pediscreen/screening",
    doc: "PediPathologyProcessor, build_prompt_pathology",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    title: "OpenVINO (Intel)",
    description: "Pose/motor and cry detection on CPU, GPU, NPU, VPU. INT8 IR, ~3x speedup.",
    icon: Cpu,
    path: "/pediscreen/voice",
    doc: "POST /api/openvino/motor, POST /api/openvino/cry",
    color: "from-red-500/20 to-red-500/5",
  },
  {
    title: "On-device voice",
    description: "Siri & Google Assistant. Infant vocalization, cry analysis, CSBS. Zero cloud PHI.",
    icon: Mic,
    path: "/pediscreen/voice",
    doc: "docs/ON_DEVICE_VOICE_AND_VIRTUAL_ASSISTANTS.md",
    color: "from-primary/20 to-primary/5",
  },
];

const IntegrationsPage = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10 space-y-3">
          <h1 className="text-3xl font-bold mb-1">Integrations</h1>
          <p className="text-muted-foreground text-lg">
            Edge-first PediScreen AI that still plugs cleanly into{" "}
            <span className="font-semibold text-foreground">radiology, lab, and EHR workflows</span>{" "}
            when they are available.
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            EDGE AI &nbsp;·&nbsp; SMART HOME &nbsp;·&nbsp; LAB &nbsp;·&nbsp; RADIOLOGY &nbsp;·&nbsp; DERMATOLOGY
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-2`}
                    >
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    <p className="text-xs text-muted-foreground font-mono mb-4">{item.doc}</p>
                    <Link to={item.path}>
                      <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        Open
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Clinical lab, radiology & dermatology roadmap */}
        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-semibold">Clinical lab, radiology & dermatology</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            PediScreen AI ships today as a{" "}
            <span className="font-semibold text-foreground">non-invasive, smartphone-only prototype</span>.
            The backend contract and FastAPI patterns are designed so you can later plug in point-of-care lab
            devices, chest X‑ray, and dermatology tools like DermaSensor without changing the core CHW workflow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Lab instruments + EHR */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Lab instruments & CBC/CRP
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pre‑lab triage today; lab‑aware CDS tomorrow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 mt-auto space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <TestTubes className="w-3.5 h-3.5" />
                  <span>i‑STAT, HemoCue, Masimo, Siemens epoc (CBC, Hb, CRP)</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• FastAPI pattern: <code className="font-mono text-[11px]">/lab_correlate</code> and <code className="font-mono text-[11px]">/pediscreen_lab_fusion</code> for CBC/CRP fusion.</li>
                  <li>• Use PediScreen&apos;s FHIR bundle builder to auto‑generate CBC/CRP orders for high‑risk cases.</li>
                  <li>• OLIS / OSCAR Pro ready: AI flag → lab order → result → correlated FHIR Observation.</li>
                </ul>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    <Shield className="w-3 h-3" />
                    CDS, not SaMD
                  </span>
                  <span>Roadmap: mock i‑STAT in demo → real BLE later.</span>
                </div>
              </CardContent>
            </Card>

            {/* Chest X‑ray (CXR) via MedSigLIP + MedGemma */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                    <Scan className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Pediatric chest X‑ray (CXR)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      MedSigLIP embeddings + MedGemma reasoning.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 mt-auto space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Respiratory triage → CXR upload → fused report.</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• Endpoint sketch: <code className="font-mono text-[11px]">/pediscreen_cxr_fusion</code> for DICOM/PNG + cough/rPPG context.</li>
                  <li>• Vision path reuses MedSigLIP; LoRA adapters specialize for pediatric thymus, consolidation, effusion.</li>
                  <li>• Returns a structured FHIR radiology bundle plus &quot;LOW / MONITOR / REFER&quot; escalation signal.</li>
                </ul>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                    <Brain className="w-3 h-3" />
                    Novel Task: pediatric CXR
                  </span>
                  <span>Demo: MinXray photo → PediScreen CXR card.</span>
                </div>
              </CardContent>
            </Card>

            {/* Dermatology & DermaSensor */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Dermatology & DermaSensor
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Skin triage that shares the same camera + workflow.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 mt-auto space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Atopic dermatitis, diaper rash, birthmarks, infection triage.</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• Reuses PediScreen&apos;s MedSigLIP vision stack with pediatric derm LoRA heads (EASI, diaper, vascular).</li>
                  <li>• DermaSensor JPEGs can flow through the same <code className="font-mono text-[11px]">/upload_image</code> path for combined risk.</li>
                  <li>• Outputs: derm risk, family‑friendly explanation, and developmental context in a single report.</li>
                </ul>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                    <Shield className="w-3 h-3" />
                    Works with / without device
                  </span>
                  <span>Edge‑ready: 2–3s on modern phones.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Backend APIs and docs: AGENTS.md, OPENVINO_INTEGRATION.md, MRI_INTEGRATION.md, CT_3D_EDGE_INTEGRATION.md.</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default IntegrationsPage;
