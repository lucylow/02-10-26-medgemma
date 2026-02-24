/**
 * Oracle verification card — shows Chainlink-verified PediScreen result.
 * Reads from PediScreenOracle; does not initiate on-chain writes.
 */

import { ShieldCheck, Activity, Link2 } from "lucide-react";
import { useOracle } from "@/hooks/useOracle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface OracleVerificationCardProps {
  /** On-chain screeningId (numeric counter from PediScreenOracle). */
  screeningId?: number | bigint;
  className?: string;
}

export function OracleVerificationCard({
  screeningId,
  className,
}: OracleVerificationCardProps) {
  const { record, loading, error, isConfigured, riskLabel, riskColor, refresh } =
    useOracle(screeningId);

  if (!isConfigured) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-xs text-muted-foreground",
          className,
        )}
      >
        PediScreen Oracle not configured. Set{" "}
        <code className="text-[10px]">VITE_PEDISCREEN_ORACLE_ADDRESS</code> to
        enable Chainlink-verified screenings.
      </div>
    );
  }

  if (screeningId == null) {
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-card p-3 text-xs text-muted-foreground",
          className,
        )}
      >
        Provide an on-chain <span className="font-mono">screeningId</span> to
        track oracle verification status.
      </div>
    );
  }

  const riskBadgeClass =
    riskColor === "low"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : riskColor === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : riskColor === "high"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-muted text-muted-foreground border-border";

  return (
    <Card className={cn("border border-border bg-card", className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            Oracle verification (Chainlink)
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => refresh()}
          disabled={loading}
          title="Refresh from chain"
        >
          <Activity className="w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="pt-1 space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Link2 className="w-3 h-3" />
            ID: {String(screeningId)}
          </span>
          {riskLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                riskBadgeClass,
              )}
            >
              Risk: {riskLabel}
            </span>
          )}
          {record?.confidence != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Confidence: {(record.confidence * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {record ? (
          <div className="space-y-1">
            <p className="text-xs text-foreground">
              Verified for child <span className="font-mono">{record.childId}</span>{" "}
              at{" "}
              {new Date(record.timestamp * 1000).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              .
            </p>
            {record.ipfsCid && (
              <p className="text-[10px] text-muted-foreground break-all">
                IPFS CID: <span className="font-mono">{record.ipfsCid}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Awaiting Chainlink oracle verification for this screening.
          </p>
        )}

        {error && (
          <p className="text-[10px] text-destructive break-words">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

