import React from "react";
import { useDAO } from "../../contexts/DAOContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { shortenAddress } from "../../utils/shortenAddress";
import { Clock, Wallet } from "lucide-react";

export const TimelockStatus: React.FC = () => {
  const { timelockDelay, treasuryAddress, timelockAddress } = useDAO();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timelock & Treasury
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Timelock delay</p>
          <p className="text-lg font-bold text-amber-900">{timelockDelay}</p>
          <p className="mt-1 text-xs text-amber-700">
            Successful proposals must wait this period before execution.
          </p>
        </div>
        {timelockAddress && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Timelock:</span>
            <span className="font-mono text-gray-700">
              {shortenAddress(timelockAddress, 6)}
            </span>
          </div>
        )}
        {treasuryAddress && (
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Treasury:</span>
            <span className="font-mono text-gray-700">
              {shortenAddress(treasuryAddress, 6)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
