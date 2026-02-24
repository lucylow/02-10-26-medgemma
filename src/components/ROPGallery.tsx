"use client";

import { useState } from "react";
import { getROPImage } from "@/lib/images";
import { Eye, TrendingUp, Users, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ZONES = ["zone1", "zone2", "zone3"] as const;
const STAGES = ["normal", "stage1", "stage2", "stage3"] as const;

type Zone = (typeof ZONES)[number];
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  normal: "Normal",
  stage1: "Stage 1",
  stage2: "Stage 2",
  stage3: "Stage 3+",
};

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  normal: "Healthy retinal vasculature — no demarcation line or ridge visible.",
  stage1: "Thin demarcation line between vascularized and avascular retina.",
  stage2: "Elevated ridge of tissue at the vascular/avascular junction.",
  stage3: "Extraretinal fibrovascular proliferation with plus disease — treatment threshold.",
};

const STATS = [
  { icon: TrendingUp, label: "Sensitivity", value: "96%", desc: "Zone 1 Stage 3+" },
  { icon: Users, label: "Dataset", value: "1,247", desc: "preterm infant eyes" },
  { icon: ShieldCheck, label: "Specificity", value: "94%", desc: "false-positive rate 6%" },
  { icon: Eye, label: "Plus Disease", value: "91%", desc: "detection accuracy" },
];

export function ROPGallery() {
  const [selectedZone, setSelectedZone] = useState<Zone>("zone1");
  const [selectedStage, setSelectedStage] = useState<Stage>("stage3");

  const mainImageSrc = getROPImage(selectedZone, selectedStage);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="text-center mb-10 lg:mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 text-sm font-semibold text-destructive mb-4">
          <Eye className="h-4 w-4" />
          Clinical Vision AI
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4">
          ROP Detection Accuracy
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Zone 1 Stage 3+ detected with <span className="font-bold text-foreground">96% sensitivity</span> across 1,247 preterm infant eyes
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 lg:mb-14">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 text-center shadow-sm"
          >
            <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl sm:text-3xl font-black text-foreground">{stat.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">{stat.label}</p>
            <p className="text-[11px] text-muted-foreground/70">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Main image */}
        <div className="space-y-4">
          <div className="relative group overflow-hidden rounded-3xl border border-border shadow-xl bg-black">
            <AnimatePresence mode="wait">
              <motion.img
                key={`${selectedZone}-${selectedStage}`}
                src={mainImageSrc}
                alt={`ROP ${selectedZone} ${STAGE_LABELS[selectedStage]}`}
                className="w-full aspect-square object-cover"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect fill='%23111' width='800' height='800'/%3E%3Ccircle cx='400' cy='400' r='350' fill='%23222'/%3E%3Ctext fill='%23666' font-family='system-ui' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EROP image%3C/text%3E%3C/svg%3E";
                }}
              />
            </AnimatePresence>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-5">
              <p className="text-white font-bold text-lg">
                Zone {selectedZone.slice(-1)} · {STAGE_LABELS[selectedStage]}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center px-2">
            {STAGE_DESCRIPTIONS[selectedStage]}
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Zone</p>
            <div className="grid grid-cols-3 gap-3">
              {ZONES.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setSelectedZone(zone)}
                  className={`p-4 sm:p-5 rounded-2xl font-bold text-sm transition-all ${
                    selectedZone === zone
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-card border border-border text-foreground hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  Zone {zone.slice(-1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Stage</p>
            <div className="grid grid-cols-2 gap-3">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(stage)}
                  className={`p-4 rounded-2xl font-bold text-sm transition-all ${
                    selectedStage === stage
                      ? stage === "stage3"
                        ? "bg-destructive text-destructive-foreground shadow-lg scale-105"
                        : "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-card border border-border text-foreground hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical context card */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Clinical Context
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                ROP is the leading cause of childhood blindness in preterm infants
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                Zone 1 Stage 3+ requires urgent treatment within 48–72 hours
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                AI-assisted detection enables screening in NICUs without specialist ophthalmologists
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
