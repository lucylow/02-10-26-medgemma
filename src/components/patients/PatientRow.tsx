"use client";

import { motion } from "framer-motion";
import { RiskChip } from "@/components/RiskChip";
import type { HumanizedPatient } from "@/data/clinical/HumanizedMockData";

export interface PatientRowProps {
  patient: HumanizedPatient;
  isSelected?: boolean;
  onClick: () => void;
  tabIndex?: number;
}

export function PatientRow({
  patient,
  isSelected = false,
  onClick,
  tabIndex,
}: PatientRowProps) {
  return (
    <motion.div
      layout
      animate={
        isSelected
          ? {
              scale: 1.02,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              borderColor: "#3B82F6",
            }
          : {}
      }
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={tabIndex}
      role="button"
      aria-label={`Open chart for ${patient.name.preferred}, ${patient.clinical.risk_level} risk`}
      className={`group relative bg-white/80 backdrop-blur-xl hover:bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl border-4 transition-all cursor-pointer min-h-[120px] md:min-h-[96px] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 ${
        isSelected
          ? "border-blue-500 ring-4 ring-blue-500/20"
          : "border-transparent hover:border-gray-200"
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 items-start gap-6 h-full">
        {/* CHW Avatar + Name — 96px touch-friendly */}
        <div className="flex items-start gap-4 lg:col-span-2">
          <div className="relative flex-shrink-0">
            <img
              src={patient.chw.photo_url}
              alt=""
              className="w-20 h-20 md:w-16 md:h-16 rounded-2xl ring-4 ring-white/50 shadow-lg object-cover bg-gray-200"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white" aria-hidden="true">
                ✓
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {patient.name.preferred}
            </h3>
            <p className="text-lg text-gray-600 mt-1 line-clamp-1">
              {patient.chw.assigned}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {patient.demographics.location}
            </p>
          </div>
        </div>

        {/* Clinical Data */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-3xl font-black text-gray-900">
              {patient.demographics.age_months}mo
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              Age
            </div>
          </div>
          <div>
            <div className="text-3xl font-black">
              {patient.clinical.growth_z.length.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              Z-Score
            </div>
          </div>
        </div>

        {/* Risk + Action — min 96px tap target for chip */}
        <div className="flex flex-col items-end gap-4 pt-2 lg:pt-0">
          <div className="min-h-[48px] flex items-center">
            <RiskChip level={patient.clinical.risk_level} size="lg">
              {patient.clinical.confidence > 0.9 ? "🔥" : "⚡"}
            </RiskChip>
          </div>
          <div className="flex gap-1 text-sm font-mono text-gray-500">
            <span>{Math.round(patient.clinical.confidence * 100)}%</span>
            <span aria-hidden="true">•</span>
            <span>{patient.clinical.last_screening}</span>
          </div>
        </div>
      </div>

      {/* Human story */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm italic text-gray-600 line-clamp-2">
          {patient.story}
        </p>
      </div>

      {/* Keyboard indicator */}
      {isSelected && (
        <div
          className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
          aria-hidden="true"
        >
          SELECTED ↑↓ Enter →
        </div>
      )}
    </motion.div>
  );
}
