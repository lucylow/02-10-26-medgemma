'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ConsentNFTScreen } from '@/components/ConsentNFTScreen';
import { ConsentManager } from '@/components/ConsentManager';
import { MedGemmaAnalysis } from '@/components/MedGemmaAnalysis';
import type { MedicalRecord } from '@/hooks/useConsentNFT';

export default function PediScreenDApp() {
  const [analysisResult, setAnalysisResult] = useState<MedicalRecord | null>(null);
  const [showConsentManager, setShowConsentManager] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-5xl font-black text-transparent">
            PediScreen AI
          </div>
          <h1 className="mx-auto mb-8 max-w-2xl text-3xl font-bold text-gray-900">
            Decentralized pediatric medical records
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Own your child&apos;s X-ray analysis as an NFT. Grant or revoke doctor access instantly.
          </p>
          <div className="mt-6 flex justify-center">
            <ConnectButton />
          </div>
        </header>

        {!analysisResult ? (
          <MedGemmaAnalysis onComplete={setAnalysisResult} />
        ) : (
          <>
            <ConsentNFTScreen
              analysisResult={analysisResult}
              onMinted={() => setShowConsentManager(true)}
            />
            {showConsentManager && <ConsentManager />}
          </>
        )}
      </div>
    </div>
  );
}
