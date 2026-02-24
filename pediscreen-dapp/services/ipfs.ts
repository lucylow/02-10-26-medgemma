'use client';

import CryptoJS from 'crypto-js';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT ?? '';

export interface MedicalRecordPayload {
  boneAgeMonths: number;
  hasFracture: boolean;
  fractureType: string;
  confidence: number;
  aiModelVersion: string;
  clinician: `0x${string}`;
}

function generateKey(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function encryptPayload(payload: MedicalRecordPayload, key: string): string {
  const json = JSON.stringify(payload);
  return CryptoJS.AES.encrypt(json, key).toString();
}

export function decryptPayload(cipher: string, key: string): MedicalRecordPayload {
  const bytes = CryptoJS.AES.decrypt(cipher, key);
  const json = bytes.toString(CryptoJS.enc.Utf8);
  if (!json) throw new Error('Decrypt failed');
  return JSON.parse(json) as MedicalRecordPayload;
}

async function pinJsonToPinata(content: string): Promise<string> {
  if (!PINATA_JWT) {
    return `QmPlaceholder${btoa(content).slice(0, 32)}`;
  }
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({ pinataContent: { encrypted: content } }),
  });
  if (!res.ok) throw new Error('Pinata upload failed');
  const data = await res.json();
  return data.IpfsHash as string;
}

export const ipfsService = {
  async encryptAndPin(
    payload: MedicalRecordPayload
  ): Promise<{ ipfsHash: string; encryptionKey: string }> {
    const encryptionKey = generateKey();
    const encrypted = encryptPayload(payload, encryptionKey);
    const ipfsHash = await pinJsonToPinata(encrypted);
    return { ipfsHash, encryptionKey };
  },
};
