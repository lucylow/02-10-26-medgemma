/**
 * QueueStatus — offline queue indicator and manual sync for PediScreen.
 * Shows pending screening count and "Sync now" when online; "Will sync when online" when offline.
 * Used in PediScreenLayout so CHWs always see queue state.
 */
import React, { useEffect, useState } from "react";
import { flush, dataURLToFile, getQueueLength } from "@/services/offlineQueue";
import { submitScreening } from "@/services/screeningApi";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;

async function sendPayload(payload: {
  childAge: string;
  domain: string;
  observations: string;
  imagePreview?: string | null;
  imageFile?: { name: string } | null;
}): Promise<void> {
  let imageFile: File | null = null;
  if (payload.imagePreview) {
    imageFile = dataURLToFile(
      payload.imagePreview,
      payload.imageFile?.name || "upload.jpg"
    );
  }
  await submitScreening({
    childAge: payload.childAge,
    domain: payload.domain,
    observations: payload.observations,
    imageFile,
  });
}

export function QueueStatus({ className }: { className?: string }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshCount = React.useCallback(async () => {
    try {
      const n = await getQueueLength();
      setPendingCount(n);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      refreshCount();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshCount]);

  const handleSync = async () => {
    if (!isOnline || pendingCount === 0) return;
    setIsSyncing(true);
    try {
      const count = await flush(sendPayload);
      setPendingCount(await getQueueLength());
      if (count > 0) {
        toast.success(`${count} screening(s) uploaded`);
      }
    } catch (e) {
      console.warn("Queue sync failed:", e);
      toast.error("Sync failed. Will retry when connection is stable.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
        isOnline
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={
        isOnline
          ? `${pendingCount} screening(s) pending upload. Sync now to upload.`
          : `${pendingCount} screening(s) waiting. Will sync when online.`
      }
    >
      {isOnline ? (
        <>
          <Inbox className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>{pendingCount}</strong> pending
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            onClick={handleSync}
            disabled={isSyncing}
            aria-label="Sync pending screenings now"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
              aria-hidden
            />
            {isSyncing ? "Syncing…" : "Sync now"}
          </Button>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>{pendingCount}</strong> waiting — will sync when online
          </span>
        </>
      )}
    </div>
  );
}

export default QueueStatus;
