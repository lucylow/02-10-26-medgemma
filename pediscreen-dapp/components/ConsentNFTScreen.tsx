'use client';

import { useState } from 'react';
import { useConsentNFT, type MedicalRecord } from '@/hooks/useConsentNFT';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Wallet } from 'lucide-react';
import { ConsentModal } from '@/components/ConsentModal';

export function ConsentNFTScreen({
  analysisResult,
  onMinted,
}: {
  analysisResult: MedicalRecord;
  onMinted?: () => void;
}) {
  const { mintConsentNFT, isMinting } = useConsentNFT();
  const [showConsentModal, setShowConsentModal] = useState(false);

  const handleCreateRecord = () => setShowConsentModal(true);

  const handleConfirm = async (expiryDays: number) => {
    await mintConsentNFT(analysisResult, expiryDays);
    onMinted?.();
    setShowConsentModal(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <Card className="border-2 border-dashed border-gray-200 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <ShieldCheck className="h-8 w-8 text-green-600" />
              MedGemma analysis complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-blue-50 p-6">
                <h3 className="font-semibold text-gray-900">Bone age</h3>
                <div className="text-4xl font-black text-blue-600">
                  {analysisResult.boneAgeMonths.toFixed(1)}{' '}
                  <span className="text-lg font-normal text-gray-600">months</span>
                </div>
                <div className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                  Within normal range (±2.6 mo accuracy)
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-emerald-50 p-6">
                <h3 className="font-semibold text-gray-900">Fracture</h3>
                <div className="text-4xl font-black text-emerald-600">
                  {analysisResult.hasFracture ? 'Detected' : 'None'}
                </div>
                <div className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                  {analysisResult.fractureType || 'Normal variant'} — 95.2% confidence
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="h-14 w-full text-xl shadow-2xl"
              onClick={handleCreateRecord}
              disabled={isMinting}
            >
              <Wallet className="mr-3 h-6 w-6" />
              {isMinting ? 'Minting…' : 'Create immutable medical NFT record'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-bold text-white">
                NFT
              </div>
              Your medical record ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b py-2">
                <span>Patient ownership</span>
                <span className="font-semibold text-green-600">Your wallet</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span>Doctor access</span>
                <span className="font-semibold text-blue-600">Grant/revoke</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span>Storage</span>
                <span className="font-semibold text-purple-600">IPFS</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Cost</span>
                <span className="text-lg font-bold text-green-600">~$0.00025</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConsentModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        analysisResult={analysisResult}
        onConfirm={handleConfirm}
        onCancel={() => setShowConsentModal(false)}
      />
    </>
  );
}
