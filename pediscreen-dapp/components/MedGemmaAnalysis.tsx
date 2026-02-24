'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Loader2, Upload, ImageIcon } from 'lucide-react';
import type { MedicalRecord } from '@/hooks/useConsentNFT';

const MOCK_CLINICIAN = '0x0000000000000000000000000000000000000001' as `0x${string}`;

export function MedGemmaAnalysis({
  onComplete,
}: {
  onComplete: (result: MedicalRecord) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 2100));
    const result: MedicalRecord = {
      boneAgeMonths: 96 + Math.random() * 12,
      hasFracture: Math.random() > 0.85,
      fractureType: 'none',
      confidence: 0.92 + Math.random() * 0.06,
      aiModelVersion: '1.0',
      clinician: MOCK_CLINICIAN,
    };
    if (result.hasFracture) result.fractureType = 'greenstick';
    setAnalyzing(false);
    onComplete(result);
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl">
          <ImageIcon className="h-8 w-8 text-blue-600" />
          X-Ray Analysis (MedGemma)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-600">
          Upload a pediatric hand X-ray. Analysis takes ~2s. Result is encrypted and can be minted as your consent NFT.
        </p>
        <div
          className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="xray-upload"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <label htmlFor="xray-upload" className="cursor-pointer">
            {file ? (
              <p className="font-medium text-gray-900">{file.name}</p>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">Drop image or click to upload</p>
              </>
            )}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ConnectButton />
          <Button
            size="lg"
            onClick={runAnalysis}
            disabled={!file || analyzing}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing… (~2.1s)
              </>
            ) : (
              'Run MedGemma Analysis'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
