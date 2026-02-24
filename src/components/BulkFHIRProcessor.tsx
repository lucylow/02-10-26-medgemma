import React, { useState } from "react";
import { motion } from "framer-motion";
import { CFreeFHIRClient } from "@/lib/fhir/cFreeClient";
import type { HAIDefRiskReport } from "@/lib/haiDef/FHIRtoHAIDef";
import { fhirToHAIDefInference } from "@/lib/haiDef/FHIRtoHAIDef";

const HAI_DEF_MODELS = {
  medgemma: "medgemma-2b-edge",
  pathFoundation: "path-foundation-stub",
  cxrFoundation: "cxr-foundation-stub",
};

export function BulkFHIRProcessor() {
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    patients_processed: 0,
    referrals_detected: 0,
    avg_latency_ms: 0,
  });
  const [cohort, setCohort] = useState<HAIDefRiskReport[]>([]);

  const processCohort = async () => {
    if (processing) return;
    setProcessing(true);

    const start = performance.now();
    try {
      const baseUrl =
        import.meta.env.VITE_FHIR_SERVER_URL ?? "https://fhir-server.c-free.org";
      const client = new CFreeFHIRClient(baseUrl);

      const patients = await client.fetchDeidentifiedCohort({
        ageMin: 0,
        ageMax: 60,
        code: ["ASQ3", "growth_measurement"],
        limit: 10000,
      });

      const results = await Promise.allSettled(
        patients.map((patient) => fhirToHAIDefInference(patient, HAI_DEF_MODELS)),
      );

      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<HAIDefRiskReport> => r.status === "fulfilled",
      );

      const referrals = fulfilled.filter(
        (r) => r.value.risk_level === "referral" || r.value.risk_level === "urgent",
      ).length;

      const duration = performance.now() - start;
      const avgLatency =
        fulfilled.length > 0 ? Math.round(duration / fulfilled.length) : 0;

      setCohort(fulfilled.map((r) => r.value));
      setStats({
        patients_processed: fulfilled.length,
        referrals_detected: referrals,
        avg_latency_ms: avgLatency,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Bulk FHIR processing failed", error);
      setStats((prev) => ({ ...prev, patients_processed: 0, referrals_detected: 0 }));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 md:p-12">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12 shadow-2xl border border-indigo-100/60">
        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-8 md:mb-12 text-center">
          Bulk FHIR Processing (c-Free)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12 text-center">
          <div className="p-6 md:p-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-md">
            <div className="text-3xl md:text-4xl font-black text-indigo-600">
              {stats.patients_processed.toLocaleString()}
            </div>
            <div className="text-sm md:text-lg font-semibold text-gray-600 mt-2">
              Patients Processed
            </div>
          </div>
          <div className="p-6 md:p-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-md">
            <div className="text-3xl md:text-4xl font-black text-red-600">
              {stats.referrals_detected}
            </div>
            <div className="text-sm md:text-lg font-semibold text-gray-600 mt-2">
              Referrals Detected
            </div>
          </div>
          <div className="p-6 md:p-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-md">
            <div className="text-3xl md:text-4xl font-bold text-green-600">
              {stats.avg_latency_ms}ms
            </div>
            <div className="text-sm md:text-lg font-semibold text-gray-600 mt-2">
              Avg Latency
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: processing ? 1 : 1.02 }}
          whileTap={{ scale: processing ? 1 : 0.98 }}
          onClick={processCohort}
          disabled={processing}
          className={`w-full px-8 md:px-16 py-4 md:py-6 rounded-3xl font-black text-lg md:text-2xl shadow-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
            processing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-3xl hover:-translate-y-1 md:hover:-translate-y-2"
          }`}
          type="button"
        >
          {processing ? "PROCESSING COHORT…" : "🚀 PROCESS 10K PATIENTS"}
        </motion.button>

        {cohort.length > 0 && (
          <p className="mt-6 text-center text-xs md:text-sm text-gray-500">
            De-identified cohort processed via HAI-DEF pipeline. No raw identifiers leave
            the c-Free boundary.
          </p>
        )}
      </div>
    </div>
  );
}

