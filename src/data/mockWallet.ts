// src/data/mockWallet.ts - Production-grade mock data + error states
export const MOCK_WALLET_DATA = {
  // Wallet states
  disconnected: {
    address: null,
    isConnected: false,
    chainId: null,
    isPolygon: false,
    ensName: null,
    balance: "0",
    status: "idle" as const,
    error: null,
  },
  connected: {
    address: "0x742d35Cc6b6DBcF823d80ADa7017a40A9D0e6637",
    isConnected: true,
    chainId: 137,
    isPolygon: true,
    ensName: "pediscreen.eth",
    balance: "2.847",
    status: "connected" as const,
    error: null,
  },
  error: {
    address: null,
    isConnected: false,
    chainId: null,
    isPolygon: false,
    ensName: null,
    balance: "0",
    status: "error" as const,
    error: "User rejected request",
  },

  // Screening NFTs (Kaggle demo ready)
  nfts: [
    {
      tokenId: 8472,
      ipfsCID: "QmPediscreen8472xYz123abcDEF456ghiJKL789",
      riskLevel: "LOW" as const,
      confidence: 0.94,
      verified: true,
      txHash: "0x1234abcd...efgh5678",
      childAgeMonths: 24,
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      keyFindings: ["On track for communication", "Strong fine motor skills"],
    },
    {
      tokenId: 8471,
      ipfsCID: "QmMediumRisk456xYz789abcDEF012ghiJKL345",
      riskLevel: "MEDIUM" as const,
      confidence: 0.87,
      verified: true,
      txHash: "0x5678efgh...ijkl9012",
      childAgeMonths: 18,
      timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      keyFindings: ["Monitor language development", "Social skills typical"],
    },
    {
      tokenId: 8470,
      ipfsCID: "QmHighRisk789xYz012abcDEF345ghiJKL678",
      riskLevel: "HIGH" as const,
      confidence: 0.92,
      verified: false,
      txHash: "0x9abcijkl...mnop3456",
      childAgeMonths: 30,
      timestamp: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
      keyFindings: ["Urgent speech therapy referral", "Motor skills delayed"],
    },
  ],

  // DAO Proposals
  daoProposals: [
    {
      id: 1,
      title: "PEDISC Treasury: Fund Hindi LoRA Adapter ($50K)",
      description:
        "Enable 1.4M Indian ASHA workers with localized MedGemma screening.",
      support: 8472,
      against: 23,
      quorum: 10000,
      status: "active" as const,
      endTimestamp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    },
    {
      id: 2,
      title: "Protocol Upgrade v2.1: zk-SNARK Privacy",
      description:
        'Prove "low risk" without revealing transcripts. Semaphore integration.',
      support: 6234,
      against: 1892,
      quorum: 8000,
      status: "active" as const,
      endTimestamp: Date.now() + 1000 * 60 * 60 * 24 * 3,
    },
    {
      id: 3,
      title: "CHW Certification Expansion: Nigeria Hausa/Yoruba",
      description:
        "Localize for 280K CHO officers. 2-hour certification track.",
      support: 9123,
      against: 45,
      quorum: 10000,
      status: "passed" as const,
      endTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
    },
  ],

  // Chainlink Oracle Verifications
  oracleVerifications: [
    {
      requestId: "0xabc123def456...789ghi012jkl",
      screeningTokenId: 8472,
      oracleMatch: true,
      confidenceMatch: 98.7,
      timestamp: Date.now() - 1000 * 60 * 2,
      oracleNode: "Chainlink Node #47",
    },
    {
      requestId: "0xdef456ghi789...012jkl345mno",
      screeningTokenId: 8471,
      oracleMatch: true,
      confidenceMatch: 95.2,
      timestamp: Date.now() - 1000 * 60 * 15,
      oracleNode: "Chainlink Node #23",
    },
    {
      requestId: "0xghi789jkl012...345mno678pqr",
      screeningTokenId: 8470,
      oracleMatch: false,
      confidenceMatch: 67.3,
      timestamp: Date.now() - 1000 * 60 * 45,
      oracleNode: "Chainlink Node #91",
    },
  ],
};

