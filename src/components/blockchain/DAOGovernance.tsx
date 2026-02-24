import { useState } from "react";

import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";

type ProposalStatus = "active" | "passed" | "failed";

interface Proposal {
  id: number;
  title: string;
  description: string;
  support: number;
  against: number;
  quorum: number;
  status: ProposalStatus;
  endTimestamp: number;
}

const INITIAL_PROPOSALS: Proposal[] = MOCK_WALLET_DATA.daoProposals.map(
  (p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    support: p.support,
    against: p.against,
    quorum: p.quorum,
    status: p.status as ProposalStatus,
    endTimestamp: p.endTimestamp,
  }),
);

export function DAOGovernance() {
  const wallet = usePediScreenWallet();
  const [proposals, setProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);
  const [votingPower] = useState<number>(0);

  const vote = async (proposalId: number, support: boolean) => {
    if (!wallet.isConnected) return;

    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              support: support ? p.support + 1 : p.support,
              against: !support ? p.against + 1 : p.against,
            }
          : p,
      ),
    );
    // In production, call DAO Governor contract vote() via wagmi or ethers.
  };

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 to-emerald-900 bg-clip-text text-transparent">
            PEDISC DAO governance
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-2">
            Your voting power:{" "}
            <span className="font-bold text-2xl text-emerald-600">
              {votingPower.toLocaleString()} PEDISC
            </span>
          </p>
        </div>
        <div
          className={cn(
            "px-4 py-2 rounded-2xl font-bold text-sm md:text-base",
            wallet.isConnected ? "wallet-connected" : "wallet-disconnected",
          )}
        >
          {wallet.isConnected && wallet.address
            ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
            : "Connect wallet"}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map((proposal) => {
          const supportPct = Math.min(
            (proposal.support / proposal.quorum) * 100,
            100,
          );
          const now = Date.now();
          const isExpired = proposal.endTimestamp < now;
          const statusClass =
            proposal.status === "active"
              ? "dao-active"
              : proposal.support > proposal.quorum
                ? "dao-passed"
                : "dao-failed";

          return (
            <div
              key={proposal.id}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border hover:shadow-xl transition-all border-gray-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                  {proposal.title}
                </h3>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    statusClass,
                  )}
                >
                  {proposal.status.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-6 line-clamp-3">
                {proposal.description}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs">
                  <span>For</span>
                  <span className="font-bold">
                    {proposal.support.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${supportPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Quorum</span>
                  <span className="font-mono">
                    {proposal.quorum.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>
                    Ends{" "}
                    {new Date(proposal.endTimestamp).toLocaleDateString()}
                  </span>
                  {isExpired && (
                    <span className="font-semibold">Voting closed</span>
                  )}
                </div>
              </div>

              {wallet.isConnected && proposal.status === "active" && !isExpired && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => vote(proposal.id, true)}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2 rounded-xl font-bold hover:shadow-lg transition-all text-xs md:text-sm"
                  >
                    Vote FOR
                  </Button>
                  <Button
                    onClick={() => vote(proposal.id, false)}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white py-2 rounded-xl font-bold hover:shadow-lg transition-all text-xs md:text-sm"
                  >
                    Vote AGAINST
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

