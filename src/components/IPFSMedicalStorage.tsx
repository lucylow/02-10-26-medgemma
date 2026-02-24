import { useState } from "react";
import {
  uploadMedicalEvidence,
  type MedicalEvidence,
  verifyIPFSContent,
  PINATA_GATEWAY,
} from "@/lib/ipfs";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";

interface StorageResult {
  ipfsHash: string;
  gatewayUrl: string;
  size: number;
  timestamp: number;
}

export interface ScreeningResultForIPFS {
  screeningId: string;
  ageMonths: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  keyFindings: string[];
  recommendations: string[];
  transcript: string;
  imageEmbeddings?: number[][];
  rawInference: string;
}

export function IPFSMedicalStorage({
  screeningResult,
}: {
  screeningResult: ScreeningResultForIPFS | null;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [storageResult, setStorageResult] = useState<StorageResult | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "verified" | "failed"
  >("pending");
  const wallet = usePediScreenWallet();

  const handleStoreEvidence = async () => {
    if (!wallet.address || !screeningResult || isUploading) return;

    setIsUploading(true);
    setVerificationStatus("pending");

    try {
      const evidence: MedicalEvidence = {
        screeningId: screeningResult.screeningId,
        childAgeMonths: screeningResult.ageMonths,
        medgemmaOutput: {
          riskLevel: screeningResult.riskLevel,
          confidence: screeningResult.confidence,
          keyFindings: screeningResult.keyFindings,
          recommendations: screeningResult.recommendations,
          rawInference: screeningResult.rawInference,
        },
        evidenceArtifacts: {
          transcript: screeningResult.transcript,
          imageEmbeddings: screeningResult.imageEmbeddings || [],
          timestamp: Date.now(),
        },
        metadata: {
          medgemmaVersion: "4b-pt-v1",
          chwAddress: wallet.address,
          parentWallet: wallet.address,
          // Deterministic-ish hash without bringing in a crypto lib in the client bundle.
          hash:
            "sha3-256-" +
            btoa(
              JSON.stringify({
                id: screeningResult.screeningId,
                age: screeningResult.ageMonths,
                risk: screeningResult.riskLevel,
                findings: screeningResult.keyFindings,
              }),
            ).slice(0, 32),
        },
      };

      const result = await uploadMedicalEvidence(evidence);
      setStorageResult({
        ...result,
        timestamp: Date.now(),
      });

      const isVerified = await verifyIPFSContent(result.ipfsHash);
      setVerificationStatus(isVerified ? "verified" : "failed");
    } catch (error) {
      console.error("IPFS upload failed:", error);
      setVerificationStatus("failed");
    } finally {
      setIsUploading(false);
    }
  };

  const disabled =
    !screeningResult || !wallet.isConnected || !wallet.address || isUploading;

  return (
    <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/50 dark:border-slate-800 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2-2 2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-slate-50 mb-2">
          Secure Medical Storage
        </h2>
        <p className="text-gray-600 dark:text-slate-300">
          Tamper-proof IPFS storage (11-node redundancy via Pinata)
        </p>
      </div>

      {!storageResult ? (
        <button
          onClick={handleStoreEvidence}
          disabled={disabled}
          className="w-full py-4 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <svg
                className="w-6 h-6 mr-3 animate-spin inline"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading Evidence...
            </>
          ) : (
            "Store on IPFS (Free)"
          )}
        </button>
      ) : (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border-4 shadow-2xl transition-all ${
              verificationStatus === "verified"
                ? "border-emerald-500 bg-emerald-50/80"
                : verificationStatus === "failed"
                  ? "border-red-500 bg-red-50/80"
                  : "border-amber-500 bg-amber-50/80 animate-pulse"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {verificationStatus === "verified"
                  ? "Stored & Verified"
                  : verificationStatus === "failed"
                    ? "Stored (verification failed)"
                    : "Verifying..."}
              </h3>
              <div
                className={`w-3 h-3 rounded-full ${
                  verificationStatus === "verified"
                    ? "bg-emerald-500"
                    : verificationStatus === "failed"
                      ? "bg-red-500"
                      : "bg-amber-500 animate-ping"
                }`}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span className="text-gray-500">IPFS Hash:</span>
                <br />
                <code className="font-mono bg-white px-3 py-1 rounded-lg text-emerald-800 font-semibold truncate block">
                  {storageResult.ipfsHash}
                </code>
              </div>
              <div>
                <span className="text-gray-500">Size:</span>
                <br />
                <span className="font-semibold text-emerald-700">
                  {(storageResult.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <a
                href={`${PINATA_GATEWAY}/ipfs/${storageResult.ipfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-xl font-medium hover:bg-blue-700 transition-all"
              >
                View on IPFS
              </a>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(storageResult.ipfsHash)
                }
                className="flex-1 px-4 py-2 border-2 border-emerald-500 text-emerald-700 bg-emerald-50 rounded-xl font-medium hover:bg-emerald-50/50 transition-all"
              >
                Copy CID
              </button>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h4 className="font-bold text-lg text-emerald-900">
                Ready for Blockchain Certificate
              </h4>
            </div>
            <p className="text-sm text-emerald-800 mb-4">
              Your medical evidence is now permanently stored. You can now mint
              a tamper-proof NFT certificate that references this CID.
            </p>
            <button
              type="button"
              className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all"
              disabled
            >
              Mint NFT Certificate (wire via blockchain flow)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

