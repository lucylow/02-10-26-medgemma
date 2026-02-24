/**
 * HealthChain POC — submit record, grant clinic access, access/verify record.
 * Wire to HealthChainPOC contract and backend when VITE_HEALTH_CHAIN_POC_ADDRESS is set.
 */
import { useCallback, useState } from "react";
import { HEALTH_CHAIN_POC_ADDRESS } from "@/config/blockchain";
import {
  buildHealthChainPayload,
  decryptFhirFromHealthChain,
  type HealthChainRecordPayload,
} from "@/services/healthChain";

export interface HealthChainRecord {
  recordId: string;
  recordHash: string;
  encryptedFhirCid: string;
  owner: string;
  consentManager?: string;
}

export interface UseHealthChainResult {
  submitToHealthChain: (
    fhirBundle: object,
    options?: { consentManager?: string }
  ) => Promise<{ recordId?: string; recordHash: string } | null>;
  grantClinicAccess: (recordId: string, clinicAddress: string) => Promise<boolean>;
  accessRecord: (recordId: string) => Promise<HealthChainRecord | null>;
  verifyRecordAccess: (
    recordId: string,
    aiReportHash?: string
  ) => Promise<{ verified: boolean; fhir?: object }>;
  revokeConsent: (recordId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export function useHealthChain(): UseHealthChainResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = !!HEALTH_CHAIN_POC_ADDRESS;

  const submitToHealthChain = useCallback(
    async (
      fhirBundle: object,
      options?: { consentManager?: string }
    ): Promise<{ recordId?: string; recordHash: string } | null> => {
      setLoading(true);
      setError(null);
      try {
        const payload = await buildHealthChainPayload(fhirBundle, options);
        if (HEALTH_CHAIN_POC_ADDRESS) {
          // TODO: call contract createRecord(payload.encryptedFhirCid, payload.recordHash, payload.signature, payload.consentManager)
          return {
            recordId: `record-${Date.now()}`,
            recordHash: payload.recordHash,
          };
        }
        return {
          recordHash: payload.recordHash,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const grantClinicAccess = useCallback(
    async (_recordId: string, _clinicAddress: string): Promise<boolean> => {
      if (!HEALTH_CHAIN_POC_ADDRESS) return false;
      setLoading(true);
      setError(null);
      try {
        // TODO: contract.grantClinicAccess(recordId, clinicAddress)
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const accessRecord = useCallback(
    async (_recordId: string): Promise<HealthChainRecord | null> => {
      if (!HEALTH_CHAIN_POC_ADDRESS) return null;
      setLoading(true);
      setError(null);
      try {
        // TODO: contract.getRecord(recordId)
        return null;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const verifyRecordAccess = useCallback(
    async (
      _recordId: string,
      _aiReportHash?: string
    ): Promise<{ verified: boolean; fhir?: object }> => {
      setLoading(true);
      setError(null);
      try {
        // TODO: contract + backend verify; decrypt FHIR if allowed
        const record = await accessRecord(_recordId);
        if (!record) return { verified: false };
        const fhir = await decryptFhirFromHealthChain(record.encryptedFhirCid);
        return { verified: true, fhir };
      } catch {
        return { verified: false };
      } finally {
        setLoading(false);
      }
    },
    [accessRecord]
  );

  const revokeConsent = useCallback(async (_recordId: string): Promise<boolean> => {
    if (!HEALTH_CHAIN_POC_ADDRESS) return false;
    setLoading(true);
    setError(null);
    try {
      // TODO: contract.revokeConsent(recordId)
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    submitToHealthChain,
    grantClinicAccess,
    accessRecord,
    verifyRecordAccess,
    revokeConsent,
    loading,
    error,
    isConfigured,
  };
}
