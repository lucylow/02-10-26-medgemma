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
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-muted-foreground text-lg">
            Smart Home, MRI, CT, pathology, OpenVINO, and voice — connect screening to edge and clinical systems.
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
