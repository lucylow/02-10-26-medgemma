/**
 * Federated learning client — register with coordinator, submit gradient hashes, earn $PEDI.
 * Wire to PediScreenFedCoordinator + PEDIRewardToken when VITE_FED_COORDINATOR_ADDRESS is set.
 */
import { useCallback, useState } from "react";
import {
  FED_COORDINATOR_ADDRESS,
  PEDI_REWARD_TOKEN_ADDRESS,
} from "@/config/blockchain";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";

export interface UseFedLearningResult {
  registerClient: () => Promise<boolean>;
  submitGradients: (gradientHash: string, datapointCount: number) => Promise<boolean>;
  balance: string | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

const REWARD_PER_DATAPOINT = 10;

export function useFedLearning(): UseFedLearningResult {
  const { address, isConnected } = usePediScreenWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = !!(FED_COORDINATOR_ADDRESS && PEDI_REWARD_TOKEN_ADDRESS);

  const registerClient = useCallback(async (): Promise<boolean> => {
    if (!FED_COORDINATOR_ADDRESS || !address) return false;
    setLoading(true);
    setError(null);
    try {
      // TODO: call contract register() or registerClient(address)
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const submitGradients = useCallback(
    async (gradientHash: string, datapointCount: number): Promise<boolean> => {
      if (!FED_COORDINATOR_ADDRESS || !address) return false;
      setLoading(true);
      setError(null);
      try {
        // TODO: contract submitGradientHash(gradientHash, datapointCount) — earns REWARD_PER_DATAPOINT * datapointCount $PEDI
        const earned = REWARD_PER_DATAPOINT * datapointCount;
        setBalance((b) =>
          b ? String(Number(b) + earned) : String(earned)
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  return {
    registerClient,
    submitGradients,
    balance,
    loading,
    error,
    isConfigured: isConfigured && isConnected,
  };
}
