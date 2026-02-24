import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Mic,
  Shield,
  Brain,
  Activity,
  Waves,
  Sparkles,
} from "lucide-react";

const VirtualAssistants: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Virtual Assistants &amp; On‑Device Voice
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              How Siri and Google Assistant turn everyday home speech into
              privacy‑preserving language screening signals for PediScreen AI.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full text-xs px-3 py-1">
          2026 edge voice pipeline • No cloud PHI
        </Badge>
      </section>

      {/* Platforms overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Siri on iPhone / iPad
              </CardTitle>
              <CardDescription>iOS 26.4 + Neural Engine</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              On‑device by default
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-semibold text-foreground mb-1">Processing</p>
                <p>A20 Neural Engine, 15s rolling audio buffer.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Models</p>
                <p>MobileBERT + Whisper‑Tiny + MedGemma LoRA (voice adapter).</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Languages</p>
                <p>25+ languages, including Mandarin‑focused babbling support.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Privacy</p>
                <p>On‑device first, Private Cloud Compute fallback when needed.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Google Assistant / Gemini Nano
              </CardTitle>
              <CardDescription>Pixel 10 + TPU</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Opt‑in cloud extras
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-semibold text-foreground mb-1">Processing</p>
                <p>Tensor Processing Unit, 16 kHz on‑device stream.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Models</p>
                <p>Gemini Nano (1.8 GB quantized) for pediatric voice intents.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Languages</p>
                <p>40+ languages including Tagalog and Hindi dialects.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Privacy</p>
                <p>On‑device by default; cloud only with explicit consent.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pipeline */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Infant Vocalization Pipeline</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Virtual assistants run a fixed, privacy‑preserving pipeline: they wake
          on &quot;Hey PediScreen&quot;, extract on‑device audio features, and
          send only compact, de‑identified scores to MedGemma for reasoning.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: "Wakeword",
              desc: '"Hey PediScreen" with 15s rolling buffer (auto‑delete).',
            },
            {
              label: "Feature extraction",
              desc: "MFCC + prosody, consonant inventory, CV syllable ratio.",
            },
            {
              label: "Language scoring",
              desc: "CSBS‑aligned percentile vs age norms on‑device.",
            },
            {
              label: "MedGemma reasoning",
              desc: "LoRA adapter turns scores into explainable language risk.",
            },
          ].map((step, idx) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full border-dashed border-muted-foreground/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {idx + 1}
                    </span>
                    {step.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Milestones + features */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="border-none shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Detected vocal milestones (6–24 months)
            </CardTitle>
            <CardDescription>
              Always‑listening assistants surface natural home vocalizations that
              are often missed during short clinic visits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-primary/5">
                <p className="font-semibold text-foreground mb-1">2–4 months</p>
                <p className="text-[11px] text-muted-foreground">
                  Cooing — sustained vowel‑like sounds (/u/, /o/, /a/), ~94%
                  detection.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5">
                <p className="font-semibold text-foreground mb-1">6–9 months</p>
                <p className="text-[11px] text-muted-foreground">
                  Canonical babbling — CV syllables (ba‑da‑ga‑ma), ~91% accuracy.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5">
                <p className="font-semibold text-foreground mb-1">9–12 months</p>
                <p className="text-[11px] text-muted-foreground">
                  Jargon — variegated babbling, prosodic contours, ~89% accuracy.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5">
                <p className="font-semibold text-foreground mb-1">
                  12–18 months
                </p>
                <p className="text-[11px] text-muted-foreground">
                  First words — word‑like vocalizations plus gestures, ~87%
                  accuracy.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5">
                <p className="font-semibold text-foreground mb-1">
                  18–24 months
                </p>
                <p className="text-[11px] text-muted-foreground">
                  50‑word vocabulary and two‑word combinations, ~85% accuracy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              On‑device feature engineering
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">Prosody</p>
              <p>
                F0 range, duration variability, and intensity contour separate
                cooing, babbling, and jargon.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Phonology</p>
              <p>
                Consonant inventory (/b, d, g, m, n/), CV ratio, and word‑shape
                complexity (CV vs CVC).
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Temporal</p>
              <p>
                Utterance rate, pause structure, and response latency (turn‑taking
                and caregiver sync).
              </p>
            </div>
            <Separator className="my-1" />
            <p className="text-[11px]">
              Only aggregated feature vectors and CSBS‑like scores leave the
              device; raw audio is never transmitted to PediScreen servers.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Commands + privacy */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              Example voice commands
            </CardTitle>
            <CardDescription>
              How parents invoke PediScreen via Siri or Google Assistant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Siri (iOS)</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>&quot;Hey Siri, PediScreen vocal check&quot;</li>
                <li>&quot;Hey Siri, PediScreen motor score&quot;</li>
                <li>&quot;Hey Siri, PediScreen weekly summary&quot;</li>
                <li>&quot;Hey Siri, send PediScreen report to Dr. Patel&quot;</li>
              </ul>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Google Assistant</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>&quot;Hey Google, PediScreen vocal screening&quot;</li>
                <li>&quot;Hey Google, PediScreen full check&quot;</li>
              </ul>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              In production, the assistant extension runs entirely on‑device and
              passes structured scores (not audio) into the PediScreen agent
              pipeline.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Privacy, performance &amp; regulatory framing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <ul className="space-y-1 list-disc list-inside">
              <li>
                15s rolling buffer with automatic deletion after analysis; no
                continuous cloud recording.
              </li>
              <li>
                End‑to‑end latency ~1.7–1.8s from wakeword to CSBS‑aligned risk
                score on iPhone 15–16 Pro.
              </li>
              <li>
                Clinical target: ~89% correlation with CSBS scores, false
                negatives &lt; 1.8% in validation cohorts.
              </li>
              <li>
                Classified as clinical decision support (non‑diagnostic) and
                aligned with HIPAA, COPPA, and PHIPA via on‑device processing.
              </li>
            </ul>
            <div className="flex items-start gap-2 text-[11px] mt-2">
              <Sparkles className="w-3 h-3 text-primary mt-0.5" />
              <p>
                Bottom line: virtual assistants turn everyday home speech into
                earlier, privacy‑preserving detection of language delays without
                changing the clinical decision boundary.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default VirtualAssistants;

