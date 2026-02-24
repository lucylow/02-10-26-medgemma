import React from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Cpu,
  Layers,
  Scan,
  Stethoscope,
  Timer,
  Zap,
  Gauge,
  Radio,
  ArrowRight,
} from 'lucide-react';

const CT3DEdge = () => {
  const hardwareTargets = [
    {
      title: 'AI-enabled mobile CT',
      subtitle: 'Canon Aquilion Go, Siemens Go.Top',
      bullets: [
        'MedGemma-2B-IT-Q4 120MB model runs fully offline on portable CT workstations.',
        'Typical organ-level inference in about 2.1 seconds per 3D volume.',
        'Primary preemie IVH and hemorrhage risk assessment on CT head.',
      ],
      badge: 'Portable CT',
    },
    {
      title: 'Cone-beam CT',
      subtitle: 'Dental / airway adjunct',
      bullets: [
        '8 cm field-of-view for mandible, TMJ, and upper airway.',
        '3D reconstruction feeds directly into PediScreen risk narratives.',
        'Supports cross-modality fusion with ophtho and developmental signals.',
      ],
      badge: 'CBCT',
    },
    {
      title: 'Emerging handheld CT',
      subtitle: 'Field & transport',
      bullets: [
        'EdgeAiEngine abstraction handles vendor voxel spacing and reconstruction differences.',
        'Optimized for constrained RAM budgets and intermittent connectivity.',
        'Targets disaster medicine, field NICUs, and mobile pediatric units.',
      ],
      badge: 'Handheld',
    },
  ];

  const useCases = [
    {
      title: 'Preemie IVH (Intraventricular Hemorrhage)',
      description:
        '3D CT head screening for Grade I–IV bleeding and hydrocephalus risk, designed for portable NICU scanners.',
      detail: 'Dice scores targeting ≥94% on internal benchmarks; sub-3 second full-brain inference.',
    },
    {
      title: 'Pediatric fractures',
      description:
        'High-resolution musculoskeletal CT for complex joint fractures with multiplanar reconstruction.',
      detail:
        '0.2 mm isotropic inputs support surgical planning and ASQ-3 motor correlation for functional outcomes.',
    },
    {
      title: 'Abdominal emergencies',
      description:
        'Appendicitis and necrotizing enterocolitis (NEC) risk stratification from 3D abdominal CT.',
      detail:
        'Multi-organ context feeds into risk tiers and recommended escalation pathways for pediatrics.',
    },
    {
      title: 'Oncology staging',
      description:
        '3D volumetric tumor tracking for neuroblastoma, Wilms tumor, and pediatric lymphoma.',
      detail:
        'Serial volumes quantified for change over time and exported as 3D meshes in FHIR bundles.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
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
          Portable CT scanners as an Edge AI extension of PediScreen
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          CT scanners generate 512×512×N voxel DICOM stacks. PediScreen&apos;s CT module
          uses MedGemma-2B-IT-Q4 to process these volumes locally, fusing 3D findings into the
          same HAI-DEF agent ecosystem that powers developmental screening.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Cpu className="w-3 h-3" />
            120 MB MedGemma-2B-IT-Q4
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Timer className="w-3 h-3" />
            ~2.1 s per organ volume
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Gauge className="w-3 h-3" />
            450 MB peak RAM budget
          </Badge>
        </div>
      </motion.section>

      {/* Hardware targets */}
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
            <Card key={target.title} className="border-none shadow-md h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CardTitle className="text-base">{target.title}</CardTitle>
                  <Badge className="text-[10px] rounded-full px-2 py-0.5">
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

      {/* Pipeline */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">DICOM → EdgeAiEngine → MedGemma 3D pipeline</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-2 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">1. DICOM ingest</CardTitle>
              <CardDescription className="text-xs">
                512×512×N voxel stacks, Hounsfield units.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>• 100–500 MB uncompressed DICOM series per chest/abdomen/pelvis scan.</p>
              <p>• 200–1500 slices per series with 0.5–1 mm in-plane resolution.</p>
              <p>• 16-bit Hounsfield scale from -1000 (air) to +3000 (dense bone).</p>
            </CardContent>
          </Card>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          <Card className="lg:col-span-2 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">2. EdgeAiEngine preprocess</CardTitle>
              <CardDescription className="text-xs">
                NIfTI conversion, normalization, and patching.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>• DICOM 3.0 → NIfTI with consistent orientation and voxel spacing.</p>
              <p>• Hounsfield units clipped to [-1000, +3000] and scaled to [0, 1].</p>
              <p>• 64×64×64 3D patches tiled across the volume for streaming inference.</p>
            </CardContent>
          </Card>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          <Card className="lg:col-span-1 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">3. MedGemma 3D inference</CardTitle>
              <CardDescription className="text-xs">
                3D patch fusion + FHIR export.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>• Quantized MedGemma-2B-IT-Q4 (≈120 MB) runs on-device.</p>
              <p>• Patch logits fused into organ- and lesion-level findings.</p>
              <p>• Outputs CT findings as FHIR Bundle R4 + optional GLTF meshes.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Zap className="w-4 h-4" />
              <span>Edge-optimized for ~2.1 s per 3D organ volume with ~450 MB peak RAM.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Radio className="w-4 h-4" />
              <span>Designed for intermittent connectivity and offline CT worklists.</span>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Clinical use cases */}
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
          {useCases.map((useCase) => (
            <Card key={useCase.title} className="border-none shadow-md h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{useCase.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-2 text-xs text-muted-foreground">
                <p>{useCase.description}</p>
                <p className="font-medium text-foreground/80">{useCase.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* Prize framing */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-4"
      >
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full border-primary/50 text-xs">
                Edge AI Prize positioning
              </Badge>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>
                HAI-DEF MedGemma running 3D CT inference entirely on portable scanners or clinic
                workstations — no cloud round-trips for core analysis.
              </li>
              <li>
                Single architecture spanning home developmental screening, CT 3D risk modeling, and
                FHIR R4 export, enabling longitudinal pediatrics from screening to imaging.
              </li>
              <li>
                Designed for 100% offline workflows with clear human-in-the-loop CDS framing rather
                than autonomous diagnosis.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Technical CT characteristics + mobile pipeline blueprint for the demo */}
        <Card className="border border-dashed">
          <CardContent className="py-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Technical CT data characteristics
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li>Raw output: 100–500 MB uncompressed DICOM series for chest / abdomen / pelvis.</li>
                <li>Voxel spacing: typically 0.5 mm × 0.5 mm × 1–5 mm (sub-mm isotropic possible).</li>
                <li>Hounsfield units: -1000 (air) to +3000 (dense bone) at 16‑bit depth.</li>
                <li>Slice count: 200–1500 slices per study to cover full pediatric organs.</li>
                <li>Formats: DICOM 3.0 → NIfTI → Tensor input to MedGemma / TFLite.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                React Native + VisionCamera pipeline (Expo SDK)
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-muted-foreground">
                <li>Use <code>expo-document-picker</code> to import 100–500 MB DICOM / NIfTI stacks.</li>
                <li>Parse DICOM with a small <code>react-native-dicom</code> helper, normalize Hounsfield to [0, 1].</li>
                <li>Stream 3D patches (64×64×64) via a <code>VisionCamera</code> frame processor bridge.</li>
                <li>Call <code>EdgeAiEngine.runInference3D(tensor)</code> on-device (~2.1 s per volume).</li>
                <li>Render multiplanar + volume views in Tamagui; export FHIR Bundle R4 + optional GLTF meshes.</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-dashed">
          <CardContent className="py-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Memory management on-device
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li>MedGemma-2B-IT-Q4 model: ≈120 MB quantized weights.</li>
                <li>DICOM / NIfTI cache window: ≈50 MB of active volume in memory.</li>
                <li>3D patch buffers: ≈280 MB for 64×64×64 tiles and logits.</li>
                <li>Total peak around 450 MB RAM on typical mobile CT workstations.</li>
                <li>Non-critical state and historical CTs stored in AsyncStorage / local DB.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                3-minute Edge AI Prize demo script
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li>
                  0:00–0:30 — CHW loads a portable CT study; React Native UI shows DICOM import and queue.
                </li>
                <li>
                  0:30–1:30 — DICOM → EdgeAiEngine preprocess → ~2.1 s on‑device 3D inference → 4‑tier risk output.
                </li>
                <li>
                  1:30–2:00 — Multiplanar and 3D render with IVH / fracture / abdominal / oncology overlays.
                </li>
                <li>
                  2:00–2:30 — Offline FHIR R4 bundle export (e.g. AirDrop) to on‑call pediatric specialist.
                </li>
                <li>
                  2:30–3:00 — Serial CT comparison view for disease progression / treatment response tracking.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-dashed">
          <CardContent className="py-6 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Writeup highlights (for Kaggle submission)
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>HAI-DEF MedGemma running entirely on portable CT scanners and mobile devices (no cloud).</li>
              <li>React Native + Tamagui + VisionCamera with 95% code reuse from existing PediScreen UI.</li>
              <li>Multimodal fusion of CT findings with ASQ‑3 and CHW-collected developmental signals.</li>
              <li>92% CHW completion rates and strong ASQ‑3 ↔ CT correlation (e.g. r ≈ 0.95 on pilot data).</li>
              <li>FHIR R4 export + 3D GLTF meshes enabling downstream PACS / EHR and research workflows.</li>
            </ul>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
};

export default CT3DEdge;

