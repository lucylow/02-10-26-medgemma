// src/components/blockchain/OracleDashboard.tsx
// Chainlink oracle dashboard (mock multi-card view for Kaggle demo).

import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import { cn } from "@/lib/utils";

export function OracleDashboard() {
  const verifications = MOCK_WALLET_DATA.oracleVerifications;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 glass-medical p-12 rounded-3xl mx-auto max-w-4xl">
          <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            Chainlink Oracle Verifications
          </h1>
          <div className="flex items-center justify-center gap-2 text-2xl mb-8">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
            <span className="font-bold text-emerald-700">98.7% Match Rate</span>
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Independent re-execution confirms MedGemma inference matches on-chain
            screening certificates. Perfect for a reliable Kaggle demo, even when
            the live oracle is offline.
          </p>
        </div>

        {/* Verification Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {verifications.map((verification) => (
            <div
              key={verification.requestId}
              className={cn(
                "glass-medical p-8 rounded-3xl shadow-2xl border-4 group hover:shadow-3xl transition-all duration-300",
                verification.oracleMatch
                  ? "border-emerald-500 nft-verified"
                  : "border-red-500 animate-pulse",
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    Screening #{verification.screeningTokenId}
                  </h3>
                  <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-1 rounded-lg">
                    <span>{verification.oracleNode}</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  </div>
                </div>
                <div
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm font-bold shadow-lg text-white",
                    verification.oracleMatch ? "bg-emerald-500" : "bg-red-500",
                  )}
                >
                  {verification.oracleMatch ? "✅ VERIFIED" : "❌ MISMATCH"}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-500">
                    Confidence Match
                  </div>
                  <div className="text-3xl font-black text-emerald-600">
                    {verification.confidenceMatch}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-500">
                    Verified
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {new Date(verification.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Request ID */}
              <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
                <div className="text-xs font-mono text-gray-500 mb-2 truncate">
                  Request ID: {verification.requestId}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-xs rounded-xl font-bold hover:bg-blue-700 transition-all">
                    🔗 PolygonScan (Mock)
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 text-xs rounded-xl font-medium hover:bg-gray-50 transition-all">
                    📋 Copy
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all">
                  View NFT Details
                </button>
                {!verification.oracleMatch && (
                  <button className="flex-1 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all">
                    Dispute Match
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

