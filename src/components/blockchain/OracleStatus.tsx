import { useMemo } from "react";

import { useOracle } from "@/hooks/useOracle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OracleStatusProps {
  screeningId?: number;
}

export function OracleStatus({ screeningId = 1 }: OracleStatusProps) {
  const { record, loading, error, isConfigured, riskLabel, riskColor, refresh } =
    useOracle(screeningId);

  const statusLabel = useMemo(() => {
    if (!isConfigured) return "Not configured";
    if (loading) return "Checking…";
    if (error) return "Error";
    if (!record) return "No verification yet";
    return record.oracleMatch ? "✅ VERIFIED" : "❌ MISMATCH";
  }, [isConfigured, loading, error, record]);

  const cardColorClass = record?.oracleMatch
    ? "border-emerald-500 bg-emerald-50/60"
    : "border-red-500 bg-red-50/60";

  const confidence =
    record?.confidence != null ? Number(record.confidence.toFixed(1)) : null;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Chainlink oracle verifications
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Independent re-execution of MedGemma inference confirms on-chain
            screening integrity.
          </p>
        </div>

        {!isConfigured && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-700">
            Chainlink PediScreenOracle is not configured. Set{" "}
            <code className="font-mono text-xs">
              VITE_PEDISCREEN_ORACLE_ADDRESS
            </code>{" "}
            to enable live oracle status.
          </div>
        )}

        {isConfigured && (
          <div
            className={cn(
              "p-6 md:p-8 rounded-3xl shadow-xl border-4 transition-all group hover:shadow-2xl mt-4",
              cardColorClass,
            )}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Screening #{String(screeningId)}
                </h3>
                {record?.requestId && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>Request ID:</span>
                    <code className="font-mono bg-white/80 px-2 py-1 rounded text-[11px] truncate max-w-xs">
                      {record.requestId}
                    </code>
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-lg",
                  record?.oracleMatch ? "bg-emerald-500 text-white" : "bg-red-500 text-white",
                )}
              >
                {statusLabel}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  Oracle risk
                </div>
                <div
                  className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                    riskColor === "low" && "bg-emerald-100 text-emerald-800",
                    riskColor === "medium" && "bg-amber-100 text-amber-800",
                    riskColor === "high" && "bg-red-100 text-red-800",
                    riskColor === "default" && "bg-gray-200 text-gray-800",
                  )}
                >
                  {riskLabel ?? "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  Confidence match
                </div>
                <div className="text-2xl font-black text-emerald-700">
                  {confidence != null ? `${confidence}%` : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  Last updated
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {record?.timestamp
                    ? new Date(record.timestamp * 1000).toLocaleString()
                    : "No events yet"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Dispute verification
              </Button>
            </div>

            {error && (
              <p className="mt-4 text-xs text-red-600 bg-red-50/80 rounded-md px-3 py-2">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

