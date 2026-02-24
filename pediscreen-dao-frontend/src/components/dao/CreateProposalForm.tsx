import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { useDAO } from "../../contexts/DAOContext";
import { DollarSign, Plus } from "lucide-react";

export const CreateProposalForm: React.FC = () => {
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(false);
  const { createPaymentRateProposal, userVotingPower } = useDAO();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rate || Number(rate) <= 0) return;

    setLoading(true);
    try {
      await createPaymentRateProposal(Number(rate));
      setRate("");
    } catch (error) {
      console.error("Proposal failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Propose Payment Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              New Rate per Screening (USDC)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.10"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="text-right text-2xl font-bold"
            />
            <p className="mt-1 text-xs text-gray-500">
              Rate in USDC (6 decimals). Threshold: 0 PSDAO to propose.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 py-4 text-center">
            <p className="mb-1 text-sm text-gray-600">Your Voting Power</p>
            <p className="text-2xl font-bold text-blue-600">
              {userVotingPower} PSDAO
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || Number(userVotingPower) === 0}
            className="h-12 w-full text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating Proposal...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Create Payment Rate Proposal
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
