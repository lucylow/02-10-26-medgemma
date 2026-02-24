export const PEDISCREEN_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "screeningIdHash", type: "bytes32" },
      { internalType: "bytes32", name: "reportHash", type: "bytes32" },
    ],
    name: "recordScreening",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "screeningIdHash", type: "bytes32" },
    ],
    name: "getScreening",
    outputs: [
      { internalType: "address", name: "submittedBy", type: "address" },
      { internalType: "bytes32", name: "_screeningIdHash", type: "bytes32" },
      { internalType: "bytes32", name: "_reportHash", type: "bytes32" },
      { internalType: "uint64", name: "createdAt", type: "uint64" },
      { internalType: "bool", name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "screeningIdHash", type: "bytes32" },
    ],
    name: "exists",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

