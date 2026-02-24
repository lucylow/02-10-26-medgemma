'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, Clock, Key } from 'lucide-react';
import type { MedicalRecord } from '@/hooks/useConsentNFT';

export function ConsentModal({
  open,
  onOpenChange,
  analysisResult,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisResult: MedicalRecord;
  onConfirm: (days: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [expiryDays, setExpiryDays] = useState(365);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(expiryDays);
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            Secure Your Medical Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Record details</h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="font-medium text-gray-700">Bone age:</span>
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.boneAgeMonths.toFixed(1)} months
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Fracture:</span>
                <div className="text-xl font-bold">
                  {analysisResult.fractureType === 'none' ? 'None detected' : 'Detected'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Confidence:</span>
                <div className="text-xl font-bold text-green-600">
                  {(analysisResult.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">AI model:</span>
                <div>MedGemma {analysisResult.aiModelVersion}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-gray-50 p-6">
            <div className="flex items-start space-x-3 rounded-lg border bg-white p-4">
              <Checkbox
                id="patient-consent"
                checked={consentGiven}
                onCheckedChange={setConsentGiven}
              />
              <label htmlFor="patient-consent" className="flex-1 cursor-pointer space-y-2">
                <div className="text-lg font-semibold">
                  I consent to create my encrypted medical NFT
                </div>
                <ul className="ml-4 list-disc space-y-1 text-sm">
                  <li>Your record is encrypted with your key (AES-256)</li>
                  <li>You own the NFT in your wallet</li>
                  <li>You control doctor access (grant/revoke)</li>
                  <li>Cost: ~$0.00025 Polygon gas + IPFS</li>
                </ul>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Access expires in:
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  disabled={!consentGiven}
                  className="ml-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:bg-gray-100"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                  <option value={0}>Never (permanent)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row">
            <Button
              variant="outline"
              className="h-14 flex-1 text-lg"
              onClick={onCancel}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              className="h-14 flex-1 text-lg shadow-xl"
              onClick={handleConfirm}
              disabled={!consentGiven || isConfirming}
            >
              {isConfirming ? 'Creating…' : 'Create secure NFT record'}
              <Key className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500">
            HIPAA/GDPR compliant • You control access • Revoke anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
