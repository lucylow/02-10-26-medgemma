"use client";

import { useState } from "react";
import { getROPImage } from "@/lib/images";

const ZONES = ["zone1", "zone2", "zone3"] as const;
const STAGES = ["normal", "stage1", "stage2", "stage3", "stage4", "stage5"] as const;

type Zone = (typeof ZONES)[number];
type Stage = (typeof STAGES)[number];

export function ROPGallery() {
  const [selectedZone, setSelectedZone] = useState<Zone>("zone1");
  const [selectedStage, setSelectedStage] = useState<Stage>("stage1");

  const mainImageSrc = getROPImage(selectedZone, selectedStage);

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-12">
      <div className="text-center mb-12 lg:mb-20">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-4">
          ROP Detection Accuracy
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Zone 1 Stage 3+ detected with 96% sensitivity across 1,247 preterm infant eyes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Main image */}
        <div className="relative group">
          <img
            src={mainImageSrc}
            alt={`ROP ${selectedZone} ${selectedStage}`}
            className="w-full aspect-[4/3] object-cover rounded-3xl shadow-2xl ring-4 ring-gray-200/50 dark:ring-gray-600/50 group-hover:ring-blue-300/75 dark:group-hover:ring-blue-500/50 transition-all duration-500 bg-gray-100 dark:bg-gray-800"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect fill='%23f3f4f6' width='800' height='600'/%3E%3Ctext fill='%236b7280' font-family='system-ui' font-size='18' x='50%' y='50%' text-anchor='middle' dy='.3em'%3EROP image placeholder%3C/text%3E%3C/svg%3E";
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"
            aria-hidden
          />
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 text-white font-bold text-xl sm:text-2xl drop-shadow-2xl">
            Zone {selectedZone.slice(-1)} {selectedStage === "normal" ? "Normal" : selectedStage.toUpperCase()}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Zone</p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {ZONES.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setSelectedZone(zone)}
                  className={`p-4 sm:p-6 rounded-2xl font-bold transition-all ${
                    selectedZone === zone
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl scale-105"
                      : "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl"
                  }`}
                >
                  Zone {zone.slice(-1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Stage</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(stage)}
                  className={`aspect-square rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                    selectedStage === stage
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl scale-110"
                      : "bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-lg"
                  }`}
                >
                  {stage === "normal" ? "Normal" : stage.replace("stage", "")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
