/**
 * Connect wallet button for HIPAA blockchain, NFT mint, and HealthChain.
 * Uses usePediScreenWallet (window.ethereum). For full WalletConnect/wagmi see pediscreen-dao-frontend.
 */
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useA11yContext } from "@/components/a11y/AccessiblePediScreenProvider";

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
  const a11y = useA11yContext(false);
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
    a11y?.announce?.("Wallet connected");
    return (
      <div
        className={cn("flex flex-col gap-1", className)}
        data-wallet-status
        tabIndex={-1}
        aria-label={`Wallet connected, address ${shortAddress}${
          chainId != null ? ` on chain ${chainId}` : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              disconnect();
              onDisconnect?.();
              a11y?.announce?.("Wallet disconnected");
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
        className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        onClick={() =>
          connect().then(() => {
            onConnect?.();
            a11y?.announce?.("Wallet connection requested");
          })
        }
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
