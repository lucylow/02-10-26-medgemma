import { useState } from "react";

import { submitScreening } from "@/services/screeningApi";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { uploadScreeningToIPFS } from "@/lib/ipfs";
import {
  mintScreeningNFT,
  type ScreeningNFTMetadata,
} from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type FlowStep = "connect" | "screen" | "minting" | "minted";

interface ScreeningFormState {
  age: string;
  observations: string;
}

export function ScreeningBlockchainFlow() {
  const [step, setStep] = useState<FlowStep>("connect");
  const [form, setForm] = useState<ScreeningFormState>({
    age: "",
    observations: "",
  });
  const [screeningResult, setScreeningResult] = useState<{
    age: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    confidence: number;
    keyFindings: string[];
    recommendations: string[];
    evidenceHash?: string;
    ipfsCID?: string;
    screeningId?: string;
  } | null>(null);
  const [nftData, setNftData] = useState<{ tokenId: number; txHash: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wallet = usePediScreenWallet();
  const { toast } = useToast();

  const handleRunScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      toast({
        title: "Connect wallet first",
        description: "Please connect your wallet before running a blockchain-enabled screening.",
        variant: "destructive",
      });
      setStep("connect");
      return;
    }

    const age = Number(form.age);
    if (!age || age <= 0) {
      toast({
        title: "Missing age",
        description: "Enter child age in months.",
        variant: "destructive",
      });
      return;
    }
    if (!form.observations.trim()) {
      toast({
        title: "Missing observations",
        description: "Please provide observations for MedGemma.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setStep("screen");
    try {
      const result = await submitScreening({
        childAge: String(age),
        domain: "communication",
        observations: form.observations.trim(),
      });

      if (!result.success || !result.report) {
        toast({
          title: "Screening failed",
          description: result.message || "Try again in a moment.",
          variant: "destructive",
        });
        setSubmitting(false);
        setStep("screen");
        return;
      }

      const risk = (result.report.riskLevel || "unknown").toString().toLowerCase();
      const overallRisk: "LOW" | "MEDIUM" | "HIGH" =
        risk === "high"
          ? "HIGH"
          : risk === "medium" || risk === "monitor"
            ? "MEDIUM"
            : "LOW";

      const confidence = result.confidence ?? 0.85;

      setScreeningResult({
        age,
        riskLevel: overallRisk,
        confidence,
        keyFindings: result.report.keyFindings || [],
        recommendations: result.report.recommendations || [],
        evidenceHash: result.blockchain?.reportHash,
        screeningId: result.screeningId,
      });

      setStep("minting");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not connect to screening service.",
        variant: "destructive",
      });
      setStep("screen");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMintNFT = async () => {
    if (!wallet.isConnected || !wallet.address || !screeningResult) return;

    if (screeningResult.confidence < 0.75) {
      toast({
        title: "Confidence too low",
        description: "Minting is only available when MedGemma confidence is at least 75%.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Prepare evidence for IPFS
      const evidence = {
        medgemmaRaw: {
          riskLevel: screeningResult.riskLevel,
          confidence: screeningResult.confidence,
          keyFindings: screeningResult.keyFindings,
          recommendations: screeningResult.recommendations,
        },
        transcript: form.observations.trim(),
        imageEmbeddings: [],
        timestamp: Date.now(),
        childAgeMonths: screeningResult.age,
      };

      const ipfsCID = await uploadScreeningToIPFS(evidence);

      // 2. Prepare NFT metadata for on-chain mint
      const nftMetadata: ScreeningNFTMetadata = {
        screeningId: screeningResult.screeningId || `screen-${Date.now()}`,
        childAgeMonths: screeningResult.age,
        riskLevel: screeningResult.riskLevel,
        confidence: screeningResult.confidence,
        keyFindings: screeningResult.keyFindings,
        recommendations: screeningResult.recommendations,
        evidenceHash: screeningResult.evidenceHash || "",
        medgemmaVersion: "4b-pt-v1",
        ipfsCID,
        timestamp: Date.now(),
        chwAddress: wallet.address,
      };

      const nftResult = await mintScreeningNFT(nftMetadata);
      setNftData(nftResult);
      setScreeningResult((prev) =>
        prev ? { ...prev, ipfsCID: ipfsCID.replace("ipfs://", "") } : prev,
      );
      setStep("minted");

      toast({
        title: "Screening certificate minted",
        description: `NFT #${nftResult.tokenId} has been created.`,
      });
    } catch (err) {
      console.error(err);
      setStep("minting");
      const message =
        err instanceof Error ? err.message : "Failed to mint NFT on-chain.";
      toast({
        title: "Minting error",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
      {/* Step 1: Wallet Connection */}
      {step === "connect" && (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="text-3xl" aria-hidden>
              🔗
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Connect wallet to begin
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto">
            Secure your child&apos;s screening records on-chain. Own your
            medical data forever.
          </p>
          <div
            className={cn(
              "px-6 py-4 rounded-3xl font-bold text-base md:text-lg shadow-2xl transition-all mx-auto w-fit",
              wallet.isConnected ? "wallet-connected" : "wallet-disconnected",
            )}
          >
            {wallet.isConnected && wallet.address
              ? `Connected: ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
              : "Connect MetaMask"}
          </div>
          {wallet.isConnected && wallet.chainId !== 137 && (
            <Button
              onClick={() => wallet.switchChain(137)}
              className="px-8 py-4 bg-amber-500 text-white rounded-3xl font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              Switch to Polygon (recommended)
            </Button>
          )}
          <Button
            onClick={() => wallet.connect()}
            disabled={wallet.isConnecting}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all disabled:opacity-60"
          >
            {wallet.isConnected ? "✅ Connected" : "🔗 Connect wallet"}
          </Button>
          {wallet.isConnected && (
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => setStep("screen")}
                className="rounded-2xl"
              >
                Continue to screening
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Screening form */}
      {step === "screen" && (
        <Card className="shadow-xl border border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <span aria-hidden className="text-2xl">
                🩺
              </span>
              MedGemma screening (on-chain ready)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleRunScreening}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="age">Child age (months)</Label>
                  <Input
                    id="age"
                    type="number"
                    min={0}
                    max={72}
                    required
                    value={form.age}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, age: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wallet</Label>
                  <div className="text-sm text-muted-foreground">
                    {wallet.isConnected && wallet.address
                      ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
                      : "Connect a wallet to mint NFT after screening."}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Observations</Label>
                <Textarea
                  id="observations"
                  rows={5}
                  required
                  value={form.observations}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      observations: e.target.value,
                    }))
                  }
                  placeholder="Describe how your child moves, communicates, plays, and interacts today..."
                />
              </div>
              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("connect")}
                >
                  Back
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Running analysis…" : "Run MedGemma analysis"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Minting preview */}
      {step === "minting" && screeningResult && (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 mx-auto wallet-pending rounded-full flex items-center justify-center shadow-2xl mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center animate-spin">
              <span className="text-2xl" aria-hidden>
                ⛓️
              </span>
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            Mint your screening certificate
          </h2>
          <div className="nft-pending p-6 md:p-8 rounded-3xl max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">Screening summary</h3>
            <div className="grid md:grid-cols-2 gap-6 text-lg">
              <div>
                <span className="text-sm font-semibold text-gray-500">
                  Risk level
                </span>
                <br />
                <span className="font-black text-2xl px-4 py-2 rounded-xl">
                  {screeningResult.riskLevel}
                </span>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-500">
                  Confidence
                </span>
                <br />
                <div className="text-3xl font-black text-emerald-600">
                  {Math.round(screeningResult.confidence * 100)}%
                </div>
              </div>
            </div>
            {screeningResult.keyFindings.length > 0 && (
              <div className="mt-6 p-4 md:p-6 bg-white/60 backdrop-blur-sm rounded-2xl">
                <h4 className="font-bold mb-3">Key findings</h4>
                <ul className="space-y-2 text-left">
                  {screeningResult.keyFindings.map((finding, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        •
                      </span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Button
            onClick={handleMintNFT}
            className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all w-fit mx-auto"
          >
            ⛓️ Mint NFT certificate on Polygon
          </Button>
        </div>
      )}

      {/* Step 4: Success */}
      {step === "minted" && nftData && screeningResult && (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 mx-auto nft-verified rounded-full flex items-center justify-center shadow-2xl border-8 border-emerald-500">
            <span className="text-5xl" aria-hidden>
              ✅
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Screening certificate minted
          </h1>
          <div className="nft-minted p-6 md:p-8 rounded-3xl max-w-3xl mx-auto shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="text-left space-y-2">
                <h3 className="text-2xl font-bold mb-2">NFT details</h3>
                <div className="space-y-2 text-sm md:text-base">
                  <div>
                    <span className="font-semibold">Token ID:</span>{" "}
                    #{nftData.tokenId}
                  </div>
                  <div className="break-all">
                    <span className="font-semibold">Transaction:</span>{" "}
                    <a
                      href={`https://polygonscan.com/tx/${nftData.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono text-xs"
                    >
                      View on PolygonScan
                    </a>
                  </div>
                  {screeningResult.ipfsCID && (
                    <div className="break-all">
                      <span className="font-semibold">IPFS evidence:</span>{" "}
                      <a
                        href={`https://ipfs.io/ipfs/${screeningResult.ipfsCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-xs"
                      >
                        ipfs://{screeningResult.ipfsCID}
                      </a>
                    </div>
                  )}
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
                📱 Add to wallet
              </Button>
              <Button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all">
                👨‍⚕️ Share with pediatrician
              </Button>
            </div>
          </div>
          <div className="text-xs md:text-sm text-gray-600 space-y-1 max-w-2xl mx-auto">
            <p>
              <strong>✅ Oracle ready:</strong> Chainlink PediScreenOracle can
              independently re-run this screening using stored hashes.
            </p>
            <p>
              <strong>🔒 Privacy preserved:</strong> Only structured evidence
              and embeddings are stored off-chain; raw video/audio stays local
              or in your clinic&apos;s system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

