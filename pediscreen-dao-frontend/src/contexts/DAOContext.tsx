/**
 * PediScreen DAO — React context for governance: proposals, voting, execution, timelock
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";
import {
  useReadContract,
  useWriteContract,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import type { Address } from "viem";
import {
  PEDISCREEN_DAO_ADDRESS,
  PSDAO_TOKEN_ADDRESS,
  PEDISCREEN_TREASURY_ADDRESS,
  TIMELOCK_ADDRESS,
  PEDISCREEN_DAO_ABI,
  PSDAO_ABI,
  TIMELOCK_ABI,
} from "../config/blockchain";

export type ProposalStatus =
  | "pending"
  | "active"
  | "defeated"
  | "succeeded"
  | "queued"
  | "executed"
  | "canceled"
  | "expired";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  targets: Address[];
  values: bigint[];
  calldatas: `0x${string}`[];
  eta?: bigint;
  snapshot?: bigint;
  deadline?: bigint;
  proposer?: Address;
}

export const PROPOSAL_STATE_MAP: Record<number, ProposalStatus> = {
  0: "pending",
  1: "active",
  2: "canceled",
  3: "defeated",
  4: "succeeded",
  5: "queued",
  6: "expired",
  7: "executed",
};

export interface DAOContextType {
  proposals: Proposal[];
  createPaymentRateProposal: (rate: number) => Promise<string | undefined>;
  voteOnProposal: (proposalId: string, support: 0 | 1) => Promise<void>;
  queueProposal: (proposalId: string) => Promise<void>;
  executeProposal: (proposalId: string) => Promise<void>;
  delegateTokens: () => Promise<void>;
  userVotingPower: string;
  treasuryAddress: Address | undefined;
  timelockAddress: Address | undefined;
  timelockDelay: string;
  loading: boolean;
  chainId: number | undefined;
  refetchProposals: () => void;
}

const DAOContext = createContext<DAOContextType | null>(null);

const GOVERNOR_ADDRESS = (PEDISCREEN_DAO_ADDRESS || "0x0") as Address;
const TOKEN_ADDRESS = (PSDAO_TOKEN_ADDRESS || "0x0") as Address;
const TREASURY_ADDRESS = (PEDISCREEN_TREASURY_ADDRESS || "0x0") as Address;
const TIMELOCK_ADDR = (TIMELOCK_ADDRESS || "0x0") as Address;

export const DAOProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, chainId, isConnected } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposalCount, setProposalCount] = useState(0);

  const { data: userVotes } = useReadContract({
    address: TOKEN_ADDRESS !== "0x0" ? TOKEN_ADDRESS : undefined,
    abi: PSDAO_ABI,
    functionName: "getVotes",
    args: address ? [address] : undefined,
  });

  const userVotingPower = userVotes ? formatUnits(userVotes, 18) : "0";

  const { data: treasuryFromGovernor } = useReadContract({
    address: GOVERNOR_ADDRESS !== "0x0" ? GOVERNOR_ADDRESS : undefined,
    abi: PEDISCREEN_DAO_ABI,
    functionName: "treasury",
  });

  const treasuryAddress = (treasuryFromGovernor as Address) ?? TREASURY_ADDRESS;

  const timelockContractAddress =
    TIMELOCK_ADDR !== "0x0" ? TIMELOCK_ADDR : undefined;
  const { data: timelockDelayWei } = useReadContract({
    address: timelockContractAddress,
    abi: TIMELOCK_ABI,
    functionName: "getMinDelay",
  });

  const timelockDelay = useMemo(() => {
    if (timelockDelayWei == null) return "Loading...";
    const seconds = Number(timelockDelayWei);
    const days = seconds / (24 * 60 * 60);
    return `${days.toFixed(1)} days`;
  }, [timelockDelayWei]);

  const { writeContract: writeDelegate } = useWriteContract();

  const delegateTokens = useCallback(async () => {
    if (!address || TOKEN_ADDRESS === "0x0") return;
    writeDelegate({
      address: TOKEN_ADDRESS,
      abi: PSDAO_ABI,
      functionName: "delegate",
      args: [address],
    });
  }, [address, writeDelegate]);

  const { writeContract: writePropose, data: proposeTxHash } =
    useWriteContract();

  const createPaymentRateProposal = useCallback(
    async (rate: number): Promise<string | undefined> => {
      if (GOVERNOR_ADDRESS === "0x0") return undefined;
      const rateWei = parseUnits(rate.toString(), 6);
      writePropose({
        address: GOVERNOR_ADDRESS,
        abi: PEDISCREEN_DAO_ABI,
        functionName: "proposePaymentRate",
        args: [rateWei],
      });
      return proposeTxHash ?? undefined;
    },
    [writePropose, proposeTxHash]
  );

  const { writeContract: writeVote } = useWriteContract();
  const voteOnProposal = useCallback(
    async (proposalId: string, support: 0 | 1) => {
      if (GOVERNOR_ADDRESS === "0x0") return;
      writeVote({
        address: GOVERNOR_ADDRESS,
        abi: PEDISCREEN_DAO_ABI,
        functionName: "castVote",
        args: [BigInt(proposalId), support],
      });
    },
    [writeVote]
  );

  const { writeContract: writeQueue } = useWriteContract();
  const queueProposal = useCallback(
    async (proposalId: string) => {
      if (GOVERNOR_ADDRESS === "0x0") return;
      writeQueue({
        address: GOVERNOR_ADDRESS,
        abi: PEDISCREEN_DAO_ABI,
        functionName: "queue",
        args: [BigInt(proposalId)],
      });
    },
    [writeQueue]
  );

  const { writeContract: writeExecute } = useWriteContract();
  const executeProposal = useCallback(
    async (proposalId: string) => {
      if (GOVERNOR_ADDRESS === "0x0") return;
      writeExecute({
        address: GOVERNOR_ADDRESS,
        abi: PEDISCREEN_DAO_ABI,
        functionName: "executeTimelockedProposal",
        args: [BigInt(proposalId)],
      });
    },
    [writeExecute]
  );

  const refetchProposals = useCallback(() => {
    setProposalCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!isConnected || !chainId) {
      setLoading(false);
      setProposals([]);
      return;
    }

    setLoading(true);

    if (GOVERNOR_ADDRESS === "0x0") {
      setProposals([]);
      setLoading(false);
      return;
    }

    const target =
      treasuryAddress && treasuryAddress !== "0x0"
        ? treasuryAddress
        : TREASURY_ADDRESS;
    const demoProposals: Proposal[] = [
      {
        id: "1",
        title: "Set Payment Rate $0.10",
        description:
          "Update clinician payment to $0.10 per screening (USDC, 6 decimals).",
        status: "active",
        forVotes: "0",
        againstVotes: "0",
        abstainVotes: "0",
        targets: target !== "0x0" ? [target as Address] : [],
        values: [0n],
        calldatas: ["0x" as `0x${string}`],
      },
    ];
    setProposals(demoProposals);
    setLoading(false);
  }, [isConnected, chainId, proposalCount, treasuryAddress]);

  const value = useMemo<DAOContextType>(
    () => ({
      proposals,
      createPaymentRateProposal,
      voteOnProposal,
      queueProposal,
      executeProposal,
      delegateTokens,
      userVotingPower,
      treasuryAddress: treasuryAddress !== "0x0" ? treasuryAddress : undefined,
      timelockAddress: TIMELOCK_ADDR !== "0x0" ? TIMELOCK_ADDR : undefined,
      timelockDelay,
      loading,
      chainId,
      refetchProposals,
    }),
    [
      proposals,
      createPaymentRateProposal,
      voteOnProposal,
      queueProposal,
      executeProposal,
      delegateTokens,
      userVotingPower,
      treasuryAddress,
      timelockDelay,
      loading,
      chainId,
      refetchProposals,
    ]
  );

  return (
    <DAOContext.Provider value={value}>{children}</DAOContext.Provider>
  );
};

export function useDAO(): DAOContextType {
  const ctx = useContext(DAOContext);
  if (!ctx) throw new Error("useDAO must be used within DAOProvider");
  return ctx;
}
