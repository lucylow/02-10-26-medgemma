/**
 * Hook for reading PediScreen Oracle status (Chainlink-verified screenings).
 * Uses read-only provider; backend + Chainlink handle writes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PEDISCREEN_ORACLE_ADDRESS } from "@/config/blockchain";
import {
  fetchOracleRecord,
  type OracleScreeningRecord,
  type OracleRiskLevel,
  watchOracleVerifications,
} from "@/services/oracle";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";

export interface UseOracleResult {
  record: OracleScreeningRecord | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  riskLabel: string | null;
  riskColor: "default" | "low" | "medium" | "high";
  refresh: () => Promise<void>;
}

function describeRisk(level: OracleRiskLevel | undefined): {
  label: string | null;
  color: "default" | "low" | "medium" | "high";
} {
  switch (level) {
    case 0:
      return { label: "Low", color: "low" };
    case 1:
      return { label: "Medium", color: "medium" };
    case 2:
      return { label: "High", color: "high" };
    default:
      return { label: null, color: "default" };
  }
}

export function useOracle(
  screeningId?: number | bigint,
): UseOracleResult {
  const { isConnected } = usePediScreenWallet();
  const [record, setRecord] = useState<OracleScreeningRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = !!PEDISCREEN_ORACLE_ADDRESS;

  const refresh = useCallback(async () => {
    if (!isConfigured || screeningId == null || !isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOracleRecord(screeningId);
      setRecord(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, screeningId, isConnected]);

  useEffect(() => {
    if (!isConfigured || screeningId == null || !isConnected) {
      return;
    }
    void refresh();
  }, [isConfigured, screeningId, isConnected, refresh]);

  useEffect(() => {
    if (!isConfigured || screeningId == null || !isConnected) {
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        unsub = await watchOracleVerifications((evt) => {
          if (evt.screeningId === BigInt(screeningId)) {
            setRecord(evt);
          }
        }, screeningId);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) {
        unsub();
      }
    };
  }, [isConfigured, screeningId, isConnected]);

  const { label: riskLabel, color: riskColor } = useMemo(
    () => describeRisk(record?.riskLevel),
    [record?.riskLevel],
  );

  return {
    record,
    loading,
    error,
    isConfigured,
    riskLabel,
    riskColor,
    refresh,
  };
}

