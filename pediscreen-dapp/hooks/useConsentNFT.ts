'use client';

import { useState, useCallback } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignMessage,
} from 'wagmi';
import { encodeAbiParameters, keccak256, toHex, hexToBytes } from 'viem';
import { ipfsService } from '@/services/ipfs';
import { CONSENT_ABI } from '@/lib/consent-abi';

export interface MedicalRecord {
  boneAgeMonths: number;
  hasFracture: boolean;
  fractureType: string;
  confidence: number;
  aiModelVersion: string;
  clinician: `0x${string}`;
}

export interface ConsentNFTResult {
  tokenId: bigint;
  ipfsHash: string;
  dataKey: string;
  txHash: `0x${string}`;
}

const CONSENT_NFT_ADDRESS = (process.env.NEXT_PUBLIC_CONSENT_NFT ?? '') as `0x${string}`;

export function useConsentNFT() {
  const { address } = useAccount();
  const [dataKey, setDataKey] = useState<string>('');

  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const mintConsentNFT = useCallback(
    async (
      medgemmaReport: MedicalRecord,
      consentExpiryDays: number = 365
    ): Promise<ConsentNFTResult> => {
      if (!address) throw new Error('Connect wallet first');
      if (!CONSENT_NFT_ADDRESS) throw new Error('NEXT_PUBLIC_CONSENT_NFT not set');

      const consentExpirySeconds = BigInt(
        consentExpiryDays === 0 ? 0 : consentExpiryDays * 24 * 60 * 60
      );

      const { ipfsHash, encryptionKey } = await ipfsService.encryptAndPin(medgemmaReport);
      setDataKey(encryptionKey);

      const dataKeyHashHex = keccak256(toHex(encryptionKey));
      const dataKeyHashString = typeof dataKeyHashHex === 'string' ? dataKeyHashHex : toHex(dataKeyHashHex);
      const boneAgeScaled = BigInt(Math.floor(medgemmaReport.boneAgeMonths * 100));
      const confidenceScaled = BigInt(Math.floor(medgemmaReport.confidence * 100));

      const messageHash = keccak256(
        encodeAbiParameters(
          [
            { type: 'string' },
            { type: 'string' },
            { type: 'uint256' },
            { type: 'bool' },
            { type: 'uint256' },
          ],
          [
            ipfsHash,
            dataKeyHashString,
            boneAgeScaled,
            medgemmaReport.hasFracture,
            consentExpirySeconds,
          ]
        )
      );

      const signature = await signMessageAsync({
        message: { raw: hexToBytes(messageHash) },
      });
      if (!signature) throw new Error('Signature denied');

      const record = {
        encryptedIPFSHash: ipfsHash,
        dataKeyHash: dataKeyHashString,
        boneAgeMonths: boneAgeScaled,
        hasFracture: medgemmaReport.hasFracture,
        aiModelVersion: medgemmaReport.aiModelVersion,
        confidence: confidenceScaled,
        clinician: medgemmaReport.clinician,
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
      };

      const hash = await writeContractAsync({
        address: CONSENT_NFT_ADDRESS,
        abi: CONSENT_ABI,
        functionName: 'mintConsentNFT',
        args: [record, consentExpirySeconds, signature as `0x${string}`],
      });

      return {
        tokenId: BigInt(0),
        ipfsHash,
        dataKey: encryptionKey,
        txHash: hash,
      };
    },
    [address, signMessageAsync, writeContractAsync]
  );

  const grantDoctorAccess = useCallback(
    (tokenId: bigint, doctorAddress: `0x${string}`, days: number = 30) => {
      if (!CONSENT_NFT_ADDRESS) return;
      return writeContractAsync({
        address: CONSENT_NFT_ADDRESS,
        abi: CONSENT_ABI,
        functionName: 'grantViewerAccess',
        args: [tokenId, doctorAddress, BigInt(days * 24 * 60 * 60)],
      });
    },
    [writeContractAsync]
  );

  const revokeDoctorAccess = useCallback(
    (tokenId: bigint, doctorAddress: `0x${string}`) => {
      if (!CONSENT_NFT_ADDRESS) return;
      return writeContractAsync({
        address: CONSENT_NFT_ADDRESS,
        abi: CONSENT_ABI,
        functionName: 'revokeViewerAccess',
        args: [tokenId, doctorAddress],
      });
    },
    [writeContractAsync]
  );

  return {
    mintConsentNFT,
    grantDoctorAccess,
    revokeDoctorAccess,
    dataKey,
    isMinting: isPending || isConfirming,
    isSuccess,
    txHash,
  };
}
