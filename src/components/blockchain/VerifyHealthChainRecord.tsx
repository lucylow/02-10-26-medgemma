/**
 * Clinic verify & import — verify on-chain HealthChain record and optionally import FHIR.
 */
import { useState } from "react";
import { useHealthChain } from "@/hooks/useHealthChain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface VerifyHealthChainRecordProps {
  recordId: string;
  aiReportHash?: string;
  className?: string;
  onVerified?: (fhir?: object) => void;
}

export function VerifyHealthChainRecord({
  recordId,
  aiReportHash,
  className,
  onVerified,
}: VerifyHealthChainRecordProps) {
  const { verifyRecordAccess, loading, error, isConfigured } = useHealthChain();
  const [result, setResult] = useState<{ verified: boolean; fhir?: object } | null>(null);

  const handleVerify = async () => {
    const res = await verifyRecordAccess(recordId, aiReportHash);
    setResult(res);
    onVerified?.(res.fhir);
  };

  if (!isConfigured) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-sm text-muted-foreground",
          className
        )}
      >
        HealthChain POC not configured. Set VITE_HEALTH_CHAIN_POC_ADDRESS to
        verify on-chain records.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-3 text-sm",
        className
      )}
    >
      <div className="font-medium text-foreground">Verify record</div>
      <p className="text-muted-foreground text-xs">Record ID: {recordId}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? "Verifying…" : "Verify & import"}
      </Button>
      {result && (
        <p
          className={
            result.verified
              ? "mt-2 text-green-600 dark:text-green-400 text-xs"
              : "mt-2 text-destructive text-xs"
          }
        >
          {result.verified
            ? "Verified." + (result.fhir ? " FHIR loaded." : "")
            : "Verification failed."}
        </p>
      )}
      {error && <p className="mt-2 text-destructive text-xs">{error}</p>}
    </div>
  );
}
