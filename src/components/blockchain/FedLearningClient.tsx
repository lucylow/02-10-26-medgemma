/**
 * Federated learning client UI — register client, submit gradient hashes, show $PEDI balance.
 */
import { useState } from "react";
import { useFedLearning } from "@/hooks/useFedLearning";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FedLearningClientProps {
  className?: string;
}

export function FedLearningClient({ className }: FedLearningClientProps) {
  const {
    registerClient,
    submitGradients,
    balance,
    loading,
    error,
    isConfigured,
  } = useFedLearning();
  const [gradientHash, setGradientHash] = useState("");
  const [datapoints, setDatapoints] = useState(1);

  if (!isConfigured) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-sm text-muted-foreground",
          className
        )}
      >
        Federated learning not configured. Set VITE_FED_COORDINATOR_ADDRESS and
        VITE_PEDI_REWARD_TOKEN_ADDRESS, then connect wallet.
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
      <div className="font-medium text-foreground">Federated learning</div>
      {balance != null && (
        <p className="text-muted-foreground text-xs">$PEDI balance: {balance}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => registerClient()}
          disabled={loading}
        >
          {loading ? "…" : "Register client"}
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Gradient hash"
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            value={gradientHash}
            onChange={(e) => setGradientHash(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="h-9 w-16 rounded-md border border-input bg-background px-2 text-xs"
            value={datapoints}
            onChange={(e) => setDatapoints(Number(e.target.value) || 1)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              gradientHash.trim()
                ? submitGradients(gradientHash.trim(), datapoints)
                : undefined
            }
            disabled={loading || !gradientHash.trim()}
          >
            Submit
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-destructive text-xs">{error}</p>}
    </div>
  );
}
