/**
 * Connect wallet button for HIPAA blockchain, NFT mint, and HealthChain.
 * Uses usePediScreenWallet (window.ethereum). For full WalletConnect/wagmi see pediscreen-dao-frontend.
 */
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConnectWalletButtonProps {
  className?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ConnectWalletButton({
  className,
  onConnect,
  onDisconnect,
}: ConnectWalletButtonProps) {
  const {
    address,
    chainId,
    isConnecting,
    isConnected,
    connect,
    disconnect,
    error,
  } = usePediScreenWallet();

  const shortAddress =
    address &&
    `${address.slice(0, 6)}…${address.slice(address.length - 4)}`;

  if (isConnected && address) {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              disconnect();
              onDisconnect?.();
            }}
          >
            Disconnect
          </Button>
          <span className="text-muted-foreground text-sm" title={address}>
            {shortAddress}
            {chainId != null && (
              <span className="ml-1 text-xs">(chain {chainId})</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => connect().then(onConnect)}
        disabled={isConnecting}
      >
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </Button>
      {error && (
        <p className="text-destructive text-xs">{error}</p>
      )}
    </div>
  );
}
