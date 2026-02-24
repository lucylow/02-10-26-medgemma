"use strict";
/**
 * PediScreen DAO — contract addresses and ABIs (env-driven)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMELOCK_ABI = exports.PEDISCREEN_DAO_ABI = exports.PSDAO_ABI = exports.CHAIN_ID = exports.TIMELOCK_ADDRESS = exports.PEDISCREEN_TREASURY_ADDRESS = exports.PSDAO_TOKEN_ADDRESS = exports.PEDISCREEN_DAO_ADDRESS = void 0;
exports.getChainRpcUrl = getChainRpcUrl;
exports.PEDISCREEN_DAO_ADDRESS = import.meta.env.VITE_PEDISCREEN_DAO_ADDRESS || "";
exports.PSDAO_TOKEN_ADDRESS = import.meta.env.VITE_PSDAO_TOKEN_ADDRESS || "";
exports.PEDISCREEN_TREASURY_ADDRESS = import.meta.env.VITE_PEDISCREEN_TREASURY_ADDRESS || "";
exports.TIMELOCK_ADDRESS = import.meta.env.VITE_TIMELOCK_ADDRESS || "";
exports.CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || "80002", 10);
function getChainRpcUrl(chainId) {
    var env = import.meta.env.VITE_POLYGON_RPC_URL;
    if (env)
        return env;
    switch (chainId) {
        case 137:
            return "https://polygon-rpc.com";
        case 80002:
            return "https://rpc.ankr.com/polygon_amoy";
        case 80001:
            return "https://rpc.ankr.com/polygon_mumbai";
        default:
            return "https://polygon-rpc.com";
    }
}
exports.PSDAO_ABI = [
    {
        inputs: [{ name: "account", type: "address", internalType: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "delegatee", type: "address", internalType: "address" }],
        name: "delegate",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "account", type: "address", internalType: "address" }],
        name: "getVotes",
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "account", type: "address", internalType: "address" },
            { name: "blockNumber", type: "uint256", internalType: "uint256" },
        ],
        name: "getPastVotes",
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
];
exports.PEDISCREEN_DAO_ABI = [
    { inputs: [], name: "proposalThreshold", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "state", outputs: [{ name: "", type: "uint8", internalType: "enum IGovernor.ProposalState" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "targets", type: "address[]", internalType: "address[]" }, { name: "values", type: "uint256[]", internalType: "uint256[]" }, { name: "calldatas", type: "bytes[]", internalType: "bytes[]" }, { name: "description", type: "string", internalType: "string" }], name: "propose", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "queue", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "execute", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "account", type: "address", internalType: "address" }, { name: "blockNumber", type: "uint256", internalType: "uint256" }], name: "getVotes", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "proposalNeedsQueuing", outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "ratePerScreening", type: "uint256", internalType: "uint256" }], name: "proposePaymentRate", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [], name: "treasury", outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "timelock", outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "executeTimelockedProposal", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }, { name: "support", type: "uint8", internalType: "uint8" }], name: "castVote", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "nonpayable", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "proposalSnapshot", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "proposalDeadline", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "proposalProposer", outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "proposalVotes", outputs: [{ name: "againstVotes", type: "uint256", internalType: "uint256" }, { name: "forVotes", type: "uint256", internalType: "uint256" }, { name: "abstainVotes", type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }], name: "hasVoted", outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
];
exports.TIMELOCK_ABI = [
    { inputs: [], name: "getMinDelay", outputs: [{ name: "", type: "uint256", internalType: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }, { name: "index", type: "uint256", internalType: "uint256" }], name: "getRoleMember", outputs: [{ name: "", type: "address", internalType: "address" }], stateMutability: "view", type: "function" },
    { inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }, { name: "account", type: "address", internalType: "address" }], name: "hasRole", outputs: [{ name: "", type: "bool", internalType: "bool" }], stateMutability: "view", type: "function" },
];
