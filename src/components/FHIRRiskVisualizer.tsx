import React from "react";
import type { HAIDefRiskReport } from "@/lib/haiDef/FHIRtoHAIDef";

interface Props {
  cohort: HAIDefRiskReport[];
}

type CohortRiskLevel = HAIDefRiskReport["risk_level"];

export function FHIRRiskVisualizer({ cohort }: Props) {
  const riskDistribution = cohort.reduce<Record<string, number>>((acc, report) => {
    acc[report.risk_level] = (acc[report.risk_level] ?? 0) + 1;
    return acc;
  }, {});

  const total = cohort.length || 1;

  const levels: CohortRiskLevel[] = ["referral", "urgent", "monitor", "ontrack"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100">
        <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8">
          c-Free Cohort Risk Distribution
        </h3>
        <div className="space-y-4">
          {levels.map((level) => (
            <div key={level} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-white ${
                  level === "referral"
                    ? "bg-red-500"
                    : level === "urgent"
                    ? "bg-orange-500"
                    : level === "monitor"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              >
                {level.slice(0, 3).toUpperCase()}
              </div>
              <div className="text-xl md:text-3xl font-black">
                {riskDistribution[level] ?? 0} patients
              </div>
              <div className="ml-auto text-xs md:text-sm font-mono text-gray-500">
                {(((riskDistribution[level] ?? 0) / total) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-4 border border-slate-100">
        <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6">
          Highest Risk Patients
        </h3>
        {cohort
          .filter((r) => r.risk_level === "referral" || r.risk_level === "urgent")
          .sort((a, b) => b.clinical_probability - a.clinical_probability)
          .slice(0, 5)
          .map((report) => (
            <div
              key={report.patient_id}
              className="p-4 md:p-6 bg-gradient-to-r from-red-500/10 border-l-4 md:border-l-8 border-red-400 rounded-2xl"
            >
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-red-500 rounded-2xl flex items-center justify-center font-black text-lg md:text-2xl text-white">
                  P{report.patient_id.slice(-4)}
                </div>
                <div>
                  <div className="font-black text-lg md:text-2xl text-red-900">
                    {report.risk_level.toUpperCase()}
                  </div>
                  <div className="text-sm md:text-lg font-semibold text-gray-700">
                    Confidence: {(report.clinical_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs md:text-sm text-gray-500 mt-1">
                    HAI-DEF Ensemble • FHIR Provenance ({report.fhir_provenance.observations_used}{" "}
                    observations)
                  </div>
                </div>
              </div>
            </div>
          ))}
        {cohort.filter((r) => r.risk_level === "referral" || r.risk_level === "urgent").length ===
          0 && (
          <p className="text-sm text-gray-500">
            No high-risk patients in the current de-identified cohort.
          </p>
        )}
      </div>
    </div>
  );
}

