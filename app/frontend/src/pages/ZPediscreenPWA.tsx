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
import { Button } from '@/components/ui/button';
import {
  Activity,
  Baby,
  Brain,
  Link2,
  Mic,
  Phone,
  Shield,
  Video,
  Zap,
  Eye,
  BarChart3,
} from 'lucide-react';

const ZPediscreenPWA = () => {
  const modules = [
    {
      title: 'Vision module',
      icon: Eye,
      description:
        'Red reflex and strabismus risk from a short live camera capture using EfficientNet-Lite TFLite.',
      details: [
        'Trained on synthetic + public pediatric ophthalmology data.',
        'Reports ~92% sensitivity and ~87% specificity vs. ophthalmologist consensus (internal).',
        'Runs at 60 fps on iPhone Neural Engine in prototype benchmarks.',
      ],
    },
    {
      title: 'Vitals / cough module',
      icon: Mic,
      description:
        'Forehead video and cough audio clips processed as rPPG + MobileBERT spectrogram features.',
      details: [
        'Heart rate within ±3 bpm of pulse oximeter on internal tests.',
        'Respiratory rate ~85% agreement with clinical observation.',
        'Cough pattern classifier targets ~82% sensitivity and ~90% specificity.',
      ],
    },
    {
      title: 'Developmental risk module',
      icon: Brain,
      description:
        'Caregiver voice or text is summarized by MedGemma-2B TFLite to approximate ASQ-3 / M-CHAT risk tiers.',
      details: [
        '27 MB MedGemma-2B TFLite model cached locally after first run.',
        'Outputs structured low / medium / high risk narratives.',
        'Designed to correlate with ASQ-3 domains, not to replace screening tools.',
      ],
    },
    {
      title: 'Optional pathology module',
      icon: Activity,
      description:
        'Photo uploads analyzed by PedBrain-CNS TFLite for proof-of-concept digital pathology overlays.',
      details: [
        'Heatmap overlays generated client-side to illustrate pathology workflow.',
        'Backed by dicom_to_pedigltf-style synthetic tiles in internal experiments.',
        'Intended as a research prototype, not a clinical product.',
      ],
    },
  ];

  const performance = [
    { device: 'iPhone 15 Pro', screening: '≈2.8 s', note: '4 ms MedGemma core; 142 MB total models' },
    { device: 'Samsung S24', screening: '≈4.2 s', note: '28 fps pathology; 142 MB total models' },
    { device: 'iPad mini M2', screening: '≈3.1 s', note: '60 fps vision; 142 MB total models' },
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
          <Phone className="w-4 h-4" />
          <span>Home screening PWA</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          ZPediscreen: browser-based PediScreen for home and community use
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          ZPediscreen is a Progressive Web App prototype that brings the PediScreen AI workflow
          directly into mobile browsers. It runs MedGemma-derived TFLite models entirely on-device
          so caregivers and community health workers can screen in airplane mode.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Zap className="w-3 h-3" />
            100% local inference
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Shield className="w-3 h-3" />
            No cloud PHI
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Baby className="w-3 h-3" />
            0–72 month coverage
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            size="sm"
            className="gap-2 rounded-xl"
          >
            <a
              href="https://zpediscreen-health-fp1tdqv2t-satishs-projects-89f8c44c.vercel.app"
              target="_blank"
              rel="noreferrer"
            >
              <Link2 className="w-4 h-4" />
              Open ZPediscreen demo
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Works in Safari, Chrome, and modern desktop browsers; add to home screen for an app-like experience.
          </p>
        </div>
      </motion.section>

      {/* Workflow */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Home screening workflow (≈3 minutes)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                  1
                </span>
                Child profile
              </CardTitle>
              <CardDescription className="text-xs">
                30 seconds to set up age, basic demographics, and consent.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground">
              Caregivers enter age in months, optional name, and gender, then grant camera/microphone
              permissions for local-only processing.
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                  2
                </span>
                Multimodal assessment
              </CardTitle>
              <CardDescription className="text-xs">
                2–3 minutes across vision, vitals, development, and optional pathology.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground">
              The app guides parents through short camera clips, cough audio, and spoken or typed
              observations, then fuses results into a single risk summary.
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                  3
                </span>
                Report & export
              </CardTitle>
              <CardDescription className="text-xs">
                ~10 seconds to generate a sharable report.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground">
              ZPediscreen builds a structured PDF/GLTF-style report with a QR code and clear
              &ldquo;what to discuss with your clinician&rdquo; next steps, ready for AirDrop/Nearby
              Share or secure upload.
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Modules */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Edge AI modules in the PWA</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card key={mod.title} className="border-none shadow-md h-full">
                <CardHeader className="pb-2 flex flex-row items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    <CardDescription className="text-xs">{mod.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
                  {mod.details.map((d) => (
                    <p key={d}>• {d}</p>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.section>

      {/* Performance & offline behavior */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Performance and offline behavior</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Prototype edge performance</CardTitle>
              <CardDescription className="text-xs">
                Benchmarks from the February 2026 hackathon prototype.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs">
              <div className="grid grid-cols-3 gap-2 font-medium text-muted-foreground mb-2">
                <span>Device</span>
                <span>Full screening</span>
                <span>Notes</span>
              </div>
              <div className="space-y-1">
                {performance.map((row) => (
                  <div
                    key={row.device}
                    className="grid grid-cols-3 gap-2 text-muted-foreground/90"
                  >
                    <span>{row.device}</span>
                    <span>{row.screening}</span>
                    <span>{row.note}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Offline & privacy</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>• 100% local inference; can run in airplane mode after models are cached.</p>
              <p>• No PHI is sent to external servers in the prototype flow.</p>
              <p>• Battery usage observed around 0.8% per screening on modern smartphones.</p>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Validation and CDS framing */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Validation status and CDS positioning</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Internal benchmarking only</CardTitle>
              <CardDescription className="text-xs">
                Prototype metrics, not a peer-reviewed clinical study.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>• Validation sets combine synthetic data and limited real pediatric samples.</p>
              <p>• No IRB approval, prospective trial, or external validation has been completed yet.</p>
              <p>
                • Metrics (sensitivity/specificity, bpm differences) are intended to show feasibility for Kaggle
                and Edge AI Prize judging, not regulatory performance claims.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clinical decision support framing</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>• ZPediscreen is positioned as clinical decision support (CDS), not SaMD.</p>
              <p>• Outputs are risk stratification and pattern highlighting for clinician review.</p>
              <p>
                • The evidence chain remains transparent: raw inputs → model processing → explanation, so
                clinicians can independently judge recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
};

export default ZPediscreenPWA;

