// ABI for ConsentNFT.sol — mintConsentNFT, grantViewerAccess, revokeViewerAccess, canViewRecord, getPatientTokens
export const CONSENT_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'encryptedIPFSHash', type: 'string' },
          { name: 'dataKeyHash', type: 'string' },
          { name: 'boneAgeMonths', type: 'uint256' },
          { name: 'hasFracture', type: 'bool' },
          { name: 'aiModelVersion', type: 'string' },
          { name: 'confidence', type: 'uint256' },
          { name: 'clinician', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
        ],
        name: 'record',
        type: 'tuple',
      },
      { name: 'consentExpirySeconds', type: 'uint256' },
      { name: 'patientSignature', type: 'bytes' },
    ],
    name: 'mintConsentNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'viewer', type: 'address' },
      { name: 'viewerExpirySeconds', type: 'uint256' },
    ],
    name: 'grantViewerAccess',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'viewer', type: 'address' },
    ],
    name: 'revokeViewerAccess',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'viewer', type: 'address' },
    ],
    name: 'canViewRecord',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'patient', type: 'address' }],
    name: 'getPatientTokens',
    outputs: [{ name: '', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
