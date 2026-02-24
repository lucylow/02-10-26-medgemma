import React, { useState } from "react";
import { usePediScreenRegistry } from "@/blockchain/usePediScreenRegistry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BlockchainHints = {
  screeningIdHash: string;
  reportHash: string;
  registryAddress?: string;
  chainId?: number;
};

type Props = {
  screeningId: string;
  report: any;
  blockchainHints?: BlockchainHints;
  className?: string;
};

export const BlockchainAnchorCard: React.FC<Props> = ({
  screeningId,
  report,
  blockchainHints,
  className,
}) => {
  const {
    account,
    chainId,
    connect,
    recordScreening,
    getScreening,
    error: registryError,
  } = usePediScreenRegistry();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<null | boolean>(null);

  // For now we rely on backend-computed hashes when available.
  const screeningIdHash = blockchainHints?.screeningIdHash;
  const reportHash = blockchainHints?.reportHash;

  const handleConnect = async () => {
    try {
      setError(null);
      await connect();
    } catch (e: any) {
      setError(e?.message || "Failed to connect wallet");
    }
  };

  const handleAnchor = async () => {
    if (!screeningIdHash || !reportHash) {
      setError("Missing blockchain hashes from backend.");
      return;
    }
    try {
      setStatus("pending");
      setError(null);
      setVerified(null);
      const receipt = await recordScreening(screeningIdHash, reportHash);
      setTxHash(String(receipt?.hash || receipt?.transactionHash || ""));
      setStatus("success");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError(e?.message || "Failed to record screening on-chain.");
      setStatus("error");
    }
  };

  const handleVerify = async () => {
    if (!screeningIdHash || !reportHash) {
      setError("Missing hashes to verify.");
      return;
    }
    try {
      setError(null);
      const onChain = await getScreening(screeningIdHash);
      if (!onChain.exists) {
        setVerified(false);
        return;
      }
      const match =
        onChain.reportHash.toLowerCase() === reportHash.toLowerCase();
      setVerified(match);
    } catch (e: any) {
      setError(e?.message || "Verification failed.");
      setVerified(null);
    }
  };

  const effectiveChainId = blockchainHints?.chainId ?? chainId ?? 80001;

  const chainExplorerBase =
    effectiveChainId === 80001
      ? "https://mumbai.polygonscan.com/tx/"
      : effectiveChainId === 80002
        ? "https://www.oklink.com/amoy/tx/"
        : effectiveChainId === 84532
          ? "https://sepolia.basescan.org/tx/"
          : "https://etherscan.io/tx/";

  const shortAccount =
    account && `${account.slice(0, 6)}...${account.slice(-4)}`;

  return (
    <div
      className={cn(
        "mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4",
        "dark:border-slate-800 dark:bg-slate-900/40",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Blockchain integrity
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Anchor this screening summary on-chain for tamper-proof audit.
          </div>
        </div>
        {!account ? (
          <Button
            type="button"
            onClick={handleConnect}
            size="sm"
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            Connect wallet
          </Button>
        ) : (
          <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right">
            <div>Connected: {shortAccount}</div>
            {effectiveChainId && (
              <div className="mt-0.5">Chain ID: {effectiveChainId}</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 text-[11px] text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div>
          <div className="font-mono break-all">
            screeningId:{" "}
            <span className="text-slate-700 dark:text-slate-100">
              {screeningId}
            </span>
          </div>
          <div className="mt-1 font-mono break-all">
            screeningIdHash:{" "}
            <span className="text-slate-700 dark:text-slate-100">
              {screeningIdHash ?? "n/a"}
            </span>
          </div>
          <div className="mt-1 font-mono break-all">
            reportHash:{" "}
            <span className="text-slate-700 dark:text-slate-100">
              {reportHash ?? "n/a"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!account || status === "pending"}
            onClick={handleAnchor}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed"
          >
            {status === "pending" ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                Anchoring…
              </>
            ) : (
              "Anchor on-chain"
            )}
          </Button>
          <button
            type="button"
            onClick={handleVerify}
            className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-300"
          >
            Verify against chain
          </button>
        </div>
      </div>

      {txHash && (
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Anchored in tx:{" "}
          <a
            href={chainExplorerBase + txHash}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline dark:text-indigo-300"
          >
            {txHash.slice(0, 10)}…
          </a>
        </div>
      )}

      {verified !== null && (
        <div
          className={cn(
            "mt-2 rounded-md px-2 py-1 text-[11px]",
            verified
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          )}
        >
          {verified
            ? "Local report matches on-chain hash."
            : "No matching record found or hash mismatch."}
        </div>
      )}

      {(error || registryError) && (
        <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error || registryError}
        </div>
      )}

      {!screeningIdHash || !reportHash ? (
        <div className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          Backend has not provided blockchain hashes for this screening yet.
        </div>
      ) : null}
    </div>
  );
};

