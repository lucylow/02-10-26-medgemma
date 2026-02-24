/**
 * Screening result blockchain — show hash and option to mint NFT / record on-chain.
 * Wire to PediScreenRegistry (ERC721) and PaymentEscrow when addresses are configured.
 */
import { useState } from "react";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { isBlockchainConfigured } from "@/config/blockchain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ScreeningResultBlockchainProps {
  screeningId?: string;
  aiReportHash?: string;
  className?: string;
  onMinted?: (tokenId: string) => void;
}

export function ScreeningResultBlockchain({
  screeningId,
  aiReportHash,
  className,
  onMinted,
}: ScreeningResultBlockchainProps) {
  const { isConnected, address } = usePediScreenWallet();
  const [minting, setMinting] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

  const handleMint = async () => {
    if (!isConnected || !address) return;
    setMinting(true);
    try {
      // TODO: call PediScreenRegistry.mint(screeningId, aiReportHash) when contract is wired
      const tokenId = `nft-${Date.now()}`;
      setMintedTokenId(tokenId);
      onMinted?.(tokenId);
    } finally {
      setMinting(false);
    }
  };

  if (!isBlockchainConfigured) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-sm text-muted-foreground",
          className
        )}
      >
        Blockchain not configured. Set VITE_PEDISCREEN_REGISTRY_ADDRESS (and
        optional env) to enable NFT mint and on-chain screening records.
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
      <div className="font-medium text-foreground">On-chain record</div>
      {aiReportHash && (
        <p className="mt-1 break-all text-muted-foreground text-xs">
          Hash: {aiReportHash}
        </p>
      )}
      {screeningId && (
        <p className="text-muted-foreground text-xs">ID: {screeningId}</p>
      )}
      {!isConnected && (
        <p className="mt-2 text-muted-foreground text-xs">
          Connect wallet to mint screening NFT.
        </p>
      )}
      {isConnected && !mintedTokenId && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={handleMint}
          disabled={minting}
        >
          {minting ? "Minting…" : "Mint screening NFT"}
        </Button>
      )}
      {mintedTokenId && (
        <p className="mt-2 text-green-600 dark:text-green-400 text-xs">
          Minted token: {mintedTokenId}
        </p>
      )}
    </div>
  );
}
