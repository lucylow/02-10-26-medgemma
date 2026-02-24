import React from "react";
import { useDAO } from "../../contexts/DAOContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { shortenAddress } from "../../utils/shortenAddress";
import { CheckCircle, Clock, XCircle, Vote } from "lucide-react";
import type { ProposalStatus } from "../../contexts/DAOContext";

function getStatusIcon(status: ProposalStatus) {
  switch (status) {
    case "active":
      return <Vote className="h-5 w-5 text-blue-600" />;
    case "succeeded":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "queued":
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case "executed":
      return <CheckCircle className="h-5 w-5 text-green-800" />;
    case "defeated":
      return <XCircle className="h-5 w-5 text-red-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
}

function getStatusColor(status: ProposalStatus): string {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-800";
    case "succeeded":
      return "bg-green-100 text-green-800";
    case "queued":
      return "bg-yellow-100 text-yellow-800";
    case "executed":
      return "bg-green-200 text-green-900";
    case "defeated":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export const ProposalList: React.FC = () => {
  const { proposals, voteOnProposal, queueProposal, executeProposal } =
    useDAO();

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-6 w-6" />
          Active Proposals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No proposals yet. Create the first one!
          </div>
        ) : (
          proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-2xl border p-6 transition-all hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(proposal.status)}`}
                  >
                    {getStatusIcon(proposal.status)}
                    <span className="ml-1">{proposal.status.toUpperCase()}</span>
                  </div>
                  <span className="font-mono text-sm text-gray-500">
                    #{proposal.id}
                  </span>
                </div>
              </div>

              <h3 className="mb-2 text-xl font-bold">{proposal.title}</h3>
              <p className="mb-6 line-clamp-3 text-gray-600">
                {proposal.description}
              </p>

              <div className="mb-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {proposal.forVotes}
                  </div>
                  <div className="text-gray-500">For</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {proposal.againstVotes}
                  </div>
                  <div className="text-gray-500">Against</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="font-mono">
                    {proposal.targets[0]
                      ? shortenAddress(proposal.targets[0])
                      : "—"}
                  </div>
                  <div className="text-xs text-gray-500">Target</div>
                </div>
                {proposal.eta != null && (
                  <div className="rounded-xl bg-indigo-50 p-3 text-center">
                    <div className="font-bold">
                      {proposal.eta ? "Ready" : "Pending"}
                    </div>
                    <div className="text-xs text-indigo-600">Execute</div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => voteOnProposal(proposal.id, 1)}
                  className="flex-1"
                >
                  Vote For
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => voteOnProposal(proposal.id, 0)}
                  className="flex-1"
                >
                  Vote Against
                </Button>
                {proposal.status === "succeeded" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queueProposal(proposal.id)}
                    className="flex-1"
                  >
                    Queue
                  </Button>
                )}
                {proposal.status === "queued" && (
                  <Button
                    onClick={() => executeProposal(proposal.id)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Execute (after timelock)
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
