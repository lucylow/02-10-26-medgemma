"use client";

import { motion } from "framer-motion";
import { RiskChip, type RiskChipProps } from "@/components/RiskChip";

export type ClinicalCardRisk = RiskChipProps["level"];

const riskGradients: Record<ClinicalCardRisk, string> = {
  referral: "from-red-500 to-red-600",
  urgent: "from-orange-500 to-orange-600",
  monitor: "from-amber-500 to-amber-600",
  ontrack: "from-emerald-500 to-emerald-600",
};

export interface ClinicalCardProps {
  risk: ClinicalCardRisk;
  title: string;
  subtitle?: string;
  image?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ClinicalCard({
  risk,
  title,
  subtitle,
  image,
  children,
  actions,
}: ClinicalCardProps) {
  const gradient = riskGradients[risk];

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-white/50 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-500 overflow-hidden max-w-sm mx-auto"
    >
      {/* Gradient overlay by risk */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none`}
        aria-hidden
      />
      {/* Optional medical background image */}
      {image && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
          >
            <span className="text-lg sm:text-2xl font-black text-white drop-shadow-lg">
              {risk === "referral"
                ? "REF"
                : risk === "urgent"
                  ? "URG"
                  : risk === "monitor"
                    ? "MON"
                    : "OK"}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h3>
            {subtitle && (
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div
          className="text-gray-700 dark:text-gray-300 leading-relaxed"
          style={{ lineHeight: 1.6 }}
        >
          {children}
        </div>
        {actions && (
          <div className="mt-6 pt-4 border-t border-gray-200/80 dark:border-gray-600/80 flex gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
