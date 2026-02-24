// src/components/blockchain/PediScreenBlockchainFlow.tsx
// COMPLETE KAGGLE DEMO: wallet → screening → IPFS (mock) → NFT (mock)

import { useState } from "react";

import { usePediscreenWallet } from "@/hooks/usePediScreenWallet";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type FlowStep = "wallet" | "screening" | "uploading" | "minting" | "success";

interface ScreeningInput {
  age: number;
  observations: string;
}

interface MockScreeningResult {
  tokenId: number;
  ipfsCID?: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  verified: boolean;
  txHash: string;
  age: number;
  observations: string;
  rawInference: string;
  transcript: string;
}

interface MockNFTResult {
  tokenId: number;
  txHash: string;
  ipfsCID: string;
}

export function PediScreenBlockchainFlow() {
  const [step, setStep] = useState<FlowStep>("wallet");
  const [screeningResult, setScreeningResult] =
    useState<MockScreeningResult | null>(null);
  const [nftResult, setNftResult] = useState<MockNFTResult | null>(null);

  const wallet = usePediscreenWallet();

  // Mock MedGemma screening (3s realistic latency)
  const runMockScreening = async (input: ScreeningInput) => {
    await new Promise((resolve) => setTimeout(resolve, 3200)); // MedGemma inference

    const mockBase =
      MOCK_WALLET_DATA.nfts[
        Math.floor(Math.random() * MOCK_WALLET_DATA.nfts.length)
      ];

    const result: MockScreeningResult = {
      tokenId: mockBase.tokenId,
      ipfsCID: mockBase.ipfsCID,
      riskLevel: mockBase.riskLevel,
      confidence: mockBase.confidence,
      verified: mockBase.verified,
      txHash: mockBase.txHash,
      age: input.age,
      observations: input.observations,
      rawInference:
        'MedGemma-4B-Pt: "24mo child shows language delay indicators..."',
      transcript: input.observations,
    };

    setScreeningResult(result);
    return result;
  };

  const handleScreening = async (input: ScreeningInput) => {
    setStep("screening");
    await runMockScreening(input);
    setStep("uploading");
  };

  const handleUploadEvidence = async () => {
    if (!screeningResult) return;
    try {
      // Mock IPFS upload (2–4s)
      await new Promise((resolve) => setTimeout(resolve, 3500));

      const mockIPFS = {
        ipfsHash: `QmPediscreen-${Date.now()}-${
          wallet.wallet.address?.slice(-6) || "demo"
        }`,
      };

      setScreeningResult((prev) =>
        prev ? { ...prev, ipfsCID: mockIPFS.ipfsHash } : prev,
      );
      setStep("minting");
    } catch (error) {
      console.error("IPFS upload failed:", error);
      // Fallback: continue with local mock
      setScreeningResult((prev) =>
        prev ? { ...prev, ipfsCID: "QmFallbackLocalStorage" } : prev,
      );
      setStep("minting");
    }
  };

  const handleMintNFT = async () => {
    if (!screeningResult) return;

    await new Promise((resolve) => setTimeout(resolve, 4500)); // Tx + confirmation

    const mockNFT: MockNFTResult = {
      tokenId: MOCK_WALLET_DATA.nfts.length + 1,
      txHash: `0x${Math.random().toString(16).slice(2, 18)}`,
      ipfsCID: screeningResult.ipfsCID ?? "QmFallbackLocalStorage",
    };

    setNftResult(mockNFT);
    wallet.setScreeningNFTs([
      ...wallet.screeningNFTs,
      {
        tokenId: mockNFT.tokenId,
        ipfsCID: mockNFT.ipfsCID,
        riskLevel: screeningResult.riskLevel,
        confidence: screeningResult.confidence,
        verified: true,
        txHash: mockNFT.txHash,
        childAgeMonths: screeningResult.age,
        keyFindings: ["Mock MedGemma summary for Kaggle demo"],
      },
    ]);
    setStep("success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      {/* Global Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 z-50 shadow-lg">
        <div
          className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500 shadow-md transition-all duration-500 ease-out"
          style={{
            width:
              step === "wallet"
                ? "25%"
                : step === "screening"
                  ? "50%"
                  : step === "uploading"
                    ? "75%"
                    : "100%",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 pt-24">
        {step === "wallet" && (
          <WalletConnectStep
            wallet={wallet}
            onContinue={() => setStep("screening")}
          />
        )}

        {step === "screening" && (
          <ScreeningStep onComplete={handleScreening} />
        )}

        {step === "uploading" && screeningResult && (
          <UploadingStep
            screeningResult={screeningResult}
            onUpload={handleUploadEvidence}
          />
        )}

        {step === "minting" && screeningResult && (
          <MintingStep
            screeningResult={screeningResult}
            onMint={handleMintNFT}
          />
        )}

        {step === "success" && screeningResult && nftResult && (
          <SuccessStep
            screeningResult={screeningResult}
            nftResult={nftResult}
          />
        )}
      </div>

      {/* NFT Gallery Teaser */}
      <div className="fixed bottom-6 right-6 w-20 h-20 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 flex items-center justify-center cursor-pointer hover:scale-110 transition-all group md:w-24 md:h-24">
        <div className="text-2xl group-hover:text-emerald-500 transition-colors">
          🎟️
        </div>
        <span className="absolute -top-12 right-0 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap">
          {wallet.screeningNFTs.length} Certificates
        </span>
      </div>
    </div>
  );
}

// Wallet Connection Step
function WalletConnectStep({
  wallet,
  onContinue,
}: {
  wallet: ReturnType<typeof usePediscreenWallet>;
  onContinue: () => void;
}) {
  return (
    <div className="text-center glass-medical p-12 rounded-3xl">
      <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
        <svg
          className="w-16 h-16 text-white drop-shadow-lg"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      </div>

      <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">
        PediScreen AI
      </h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">
        Blockchain Medical Screening
      </h2>

      <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
        Connect wallet to run MedGemma screening and mint tamper-proof
        certificates. Your child&apos;s developmental records, secured forever
        on Polygon + IPFS.
      </p>

      {/* Wallet Button */}
      <div className="max-w-md mx-auto space-y-4">
        <button
          type="button"
          onClick={() => wallet.connectWallet(true)} // Mock mode for demo
          disabled={wallet.wallet.status === "connecting"}
          className={cn(
            "w-full px-8 py-6 rounded-3xl font-bold text-xl shadow-2xl transition-all duration-300 flex items-center justify-center gap-3",
            wallet.wallet.status === "connecting"
              ? "wallet-pending"
              : wallet.wallet.isConnected
                ? "wallet-medical scale-105 ring-4 ring-emerald-400/50"
                : "wallet-disconnected",
          )}
        >
          {wallet.wallet.status === "connecting" ? (
            <>
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : wallet.wallet.isConnected ? (
            <>
              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
              {wallet.wallet.address?.slice(0, 6)}...
              {wallet.wallet.address?.slice(-4)}
            </>
          ) : (
            "🔗 Connect Wallet (Demo Mode)"
          )}
        </button>

        {wallet.wallet.isConnected && (
          <Button
            type="button"
            onClick={onContinue}
            className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
          >
            Continue to Screening
          </Button>
        )}
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500 max-w-lg mx-auto text-center">
        <p>
          ✅ 100% Local Processing | ✅ Mock 11-Node IPFS Redundancy | ✅
          Chainlink Oracle Ready
        </p>
      </div>
    </div>
  );
}

function ScreeningStep({
  onComplete,
}: {
  onComplete: (input: ScreeningInput) => Promise<void>;
}) {
  const [age, setAge] = useState<string>("");
  const [observations, setObservations] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAge = Number(age);
    if (!parsedAge || parsedAge <= 0) return;
    if (!observations.trim()) return;
    setSubmitting(true);
    await onComplete({ age: parsedAge, observations: observations.trim() });
    setSubmitting(false);
  };

  return (
    <div className="glass-medical p-10 rounded-3xl shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <span aria-hidden className="text-2xl">
          🩺
        </span>
        MedGemma Screening (Mock)
      </h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="age">Child age (months)</Label>
            <Input
              id="age"
              type="number"
              min={0}
              max={72}
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="context">Context (optional)</Label>
            <Input
              id="context"
              placeholder="Clinic / home visit / telehealth..."
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="observations">Observations</Label>
          <Textarea
            id="observations"
            rows={5}
            required
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Describe how your child moves, communicates, plays, and interacts today..."
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Running mock analysis…" : "Run MedGemma analysis"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function UploadingStep({
  screeningResult,
  onUpload,
}: {
  screeningResult: MockScreeningResult;
  onUpload: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);

  const handleClick = async () => {
    setUploading(true);
    await onUpload();
    setUploading(false);
  };

  return (
    <div className="glass-medical p-10 rounded-3xl shadow-2xl space-y-6">
      <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <span aria-hidden className="text-2xl">
          📤
        </span>
        Upload screening evidence to IPFS (Mock)
      </h2>
      <p className="text-gray-600">
        We package the MedGemma transcript, risk level, and confidence into a
        JSON evidence file and upload it to a mock Pinata IPFS gateway for the
        demo.
      </p>
      <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-6 text-sm text-gray-800">
        <div className="font-mono text-xs mb-2 text-gray-500">
          childAgeMonths: {screeningResult.age} — risk:{" "}
          {screeningResult.riskLevel} — confidence:{" "}
          {Math.round(screeningResult.confidence * 100)}%
        </div>
        <p className="line-clamp-3">
          {screeningResult.transcript ||
            "MedGemma transcript will appear here in production."}
        </p>
      </div>
      <Button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
      >
        {uploading ? "Uploading to IPFS…" : "Upload to IPFS (Mock)"}
      </Button>
    </div>
  );
}

function MintingStep({
  screeningResult,
  onMint,
}: {
  screeningResult: MockScreeningResult;
  onMint: () => Promise<void>;
}) {
  const [minting, setMinting] = useState(false);

  const handleMint = async () => {
    setMinting(true);
    await onMint();
    setMinting(false);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto wallet-pending rounded-full flex items-center justify-center shadow-2xl mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center animate-spin">
            <span className="text-2xl" aria-hidden>
              ⛓️
            </span>
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">
          Mint your screening certificate (Mock)
        </h2>
      </div>

      <div className="nft-medium-risk p-6 md:p-8 rounded-3xl max-w-2xl mx-auto bg-white/80">
        <h3 className="text-2xl font-bold mb-4">Screening summary</h3>
        <div className="grid md:grid-cols-2 gap-6 text-lg">
          <div>
            <span className="text-sm font-semibold text-gray-500">
              Risk level
            </span>
            <div className="mt-2">
              <span className="inline-block font-black text-2xl px-4 py-2 rounded-xl risk-medium">
                {screeningResult.riskLevel}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-500">
              Confidence
            </span>
            <div className="mt-2 text-3xl font-black text-emerald-600">
              {Math.round(screeningResult.confidence * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button
          type="button"
          onClick={handleMint}
          disabled={minting}
          className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all w-fit mx-auto"
        >
          {minting
            ? "Minting NFT on Polygon (Mock)…"
            : "⛓️ Mint NFT certificate (Mock)"}
        </Button>
      </div>
    </div>
  );
}

function SuccessStep({
  screeningResult,
  nftResult,
}: {
  screeningResult: MockScreeningResult;
  nftResult: MockNFTResult;
}) {
  return (
    <div className="text-center space-y-8">
      <div className="w-32 h-32 mx-auto nft-verified rounded-full flex items-center justify-center shadow-2xl border-8 border-emerald-500">
        <span className="text-5xl" aria-hidden>
          ✅
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
        Screening certificate minted (Mock)
      </h1>
      <div className="nft-low-risk p-6 md:p-8 rounded-3xl max-w-3xl mx-auto shadow-2xl bg-white/90">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="text-left space-y-2">
            <h3 className="text-2xl font-bold mb-2">NFT details</h3>
            <div className="space-y-2 text-sm md:text-base">
              <div>
                <span className="font-semibold">Token ID:</span> #
                {nftResult.tokenId}
              </div>
              <div className="break-all">
                <span className="font-semibold">Mock transaction:</span>{" "}
                <span className="font-mono text-xs">{nftResult.txHash}</span>
              </div>
              <div className="break-all">
                <span className="font-semibold">IPFS evidence:</span>{" "}
                <span className="font-mono text-xs">
                  ipfs://{nftResult.ipfsCID}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left space-y-3">
            <h3 className="text-2xl font-bold mb-2">Clinical summary</h3>
            <div className="space-y-2">
              <div className="inline-block px-4 py-2 rounded-xl font-bold bg-emerald-100 text-emerald-800">
                {screeningResult.riskLevel} risk level
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {Math.round(screeningResult.confidence * 100)}% confidence
              </div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 pt-6 border-t border-emerald-200">
          <Button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all">
            📱 Add to wallet (Mock)
          </Button>
          <Button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all">
            👨‍⚕️ Share with pediatrician
          </Button>
        </div>
      </div>
      <div className="text-xs md:text-sm text-gray-600 space-y-1 max-w-2xl mx-auto">
        <p>
          <strong>✅ Oracle ready:</strong> Chainlink PediScreenOracle can
          independently re-run this screening using stored hashes (in
          production).
        </p>
        <p>
          <strong>🔒 Privacy preserved:</strong> Only structured evidence and
          embeddings are stored off-chain; raw video/audio stays local or in
          your clinic&apos;s system.
        </p>
      </div>
    </div>
  );
}

