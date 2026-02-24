'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useConsentNFT } from '@/hooks/useConsentNFT';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CONSENT_ABI } from '@/lib/consent-abi';
import { UserGroupIcon, NoSymbolIcon } from '@heroicons/react/24/outline';

const CONSENT_NFT_ADDRESS = (process.env.NEXT_PUBLIC_CONSENT_NFT ?? '') as `0x${string}`;

export function ConsentManager() {
  const { address } = useAccount();
  const { grantDoctorAccess, revokeDoctorAccess } = useConsentNFT();
  const [doctorAddress, setDoctorAddress] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [grantDays, setGrantDays] = useState(30);

  const { data: tokenIds } = useReadContract({
    address: CONSENT_NFT_ADDRESS || undefined,
    abi: CONSENT_ABI,
    functionName: 'getPatientTokens',
    args: address ? [address] : undefined,
  });

  const tokens = (tokenIds as bigint[] | undefined) ?? [];
  const tokenIdBigInt = selectedTokenId ? BigInt(selectedTokenId) : null;

  const handleGrant = () => {
    if (!tokenIdBigInt || !doctorAddress) return;
    grantDoctorAccess(tokenIdBigInt, doctorAddress as `0x${string}`, grantDays);
  };

  const handleRevoke = () => {
    if (!tokenIdBigInt || !doctorAddress) return;
    revokeDoctorAccess(tokenIdBigInt, doctorAddress as `0x${string}`);
  };

  return (
    <Card className="mt-8 border-2 border-gray-200 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <UserGroupIcon className="h-8 w-8 text-blue-600" />
          Manage doctor access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-600">
          Grant or revoke view access to a doctor by wallet address. Access is enforced on-chain.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Your consent NFT (token ID)
            </label>
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select token</option>
              {tokens.map((id) => (
                <option key={id.toString()} value={id.toString()}>
                  #{id.toString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Doctor wallet address
            </label>
            <input
              type="text"
              value={doctorAddress}
              onChange={(e) => setDoctorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Access duration:</span>
            <select
              value={grantDays}
              onChange={(e) => setGrantDays(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={handleGrant}
            disabled={!selectedTokenId || !doctorAddress}
          >
            Grant access
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            onClick={handleRevoke}
            disabled={!selectedTokenId || !doctorAddress}
          >
            <NoSymbolIcon className="mr-2 h-4 w-4" />
            Revoke access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
