import React from "react";
import { useAccount } from "wagmi";
import { useDAO } from "../../contexts/DAOContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Vote, User } from "lucide-react";

export const VotingPowerCard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { userVotingPower, delegateTokens } = useDAO();

  if (!isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Voting Power
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Connect your wallet to see your PSDAO voting power and delegate.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Voting Power
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-gray-600">
              {address}
            </p>
            <p className="text-xl font-bold text-gray-900">
              {userVotingPower}{" "}
              <span className="text-sm font-normal text-gray-500">PSDAO</span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => delegateTokens()}
          className="w-full"
        >
          Delegate to self (activate voting power)
        </Button>
      </CardContent>
    </Card>
  );
};
