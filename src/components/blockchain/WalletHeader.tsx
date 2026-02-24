import { useState, useCallback } from "react";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { MOCK_WALLET_DATA } from "@/data/mockWallet";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check } from "lucide-react";

export function WalletHeader() {
  const wallet = usePediScreenWallet();
  const [useMock, setUseMock] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasEthereum = typeof window !== "undefined" && !!window.ethereum;

  // Use mock data when no MetaMask or user chose mock mode
  const mockData = MOCK_WALLET_DATA.connected;
  const isConnected = useMock || wallet.isConnected;
  const address = useMock ? mockData.address : wallet.address;
  const chainId = useMock ? mockData.chainId : wallet.chainId;
  const balance = useMock ? mockData.balance : null;
  const ensName = useMock ? mockData.ensName : null;

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  const chainName = chainId === 137 ? "Polygon" : chainId === 80002 ? "Amoy" : chainId === 8453 ? "Base" : chainId === 84532 ? "Base Sepolia" : chainId ? `Chain ${chainId}` : null;

  const handleConnect = useCallback(async () => {
    if (!hasEthereum) {
      // No MetaMask → use mock
      setUseMock(true);
      return;
    }
    await wallet.connect();
  }, [hasEthereum, wallet]);

  const handleDisconnect = useCallback(() => {
    setUseMock(false);
    setShowDropdown(false);
    wallet.disconnect();
  }, [wallet]);

  const handleCopy = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={wallet.isConnecting}
          className={cn(
            "px-4 py-2 md:px-5 md:py-2.5 rounded-xl font-semibold text-xs md:text-sm",
            "bg-foreground text-background shadow-lg",
            "hover:opacity-90 transition-all flex items-center gap-2 min-w-[140px] justify-center",
            wallet.isConnecting && "opacity-60 cursor-wait"
          )}
          aria-label="Connect wallet"
        >
          <Wallet className="w-4 h-4" />
          {wallet.isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
        {wallet.error && (
          <p className="mt-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-1.5 max-w-[220px]">
            {wallet.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-medium text-xs md:text-sm",
          "bg-card border border-border shadow-lg",
          "hover:shadow-xl transition-all flex items-center gap-2.5 text-foreground"
        )}
        aria-label="Wallet menu"
        aria-expanded={showDropdown}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
        <span className="font-mono">{ensName ?? shortAddress}</span>
        {chainName && (
          <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
            {chainName}
          </span>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showDropdown && "rotate-180")} />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Balance & Address */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Balance</span>
                {useMock && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">
                {balance ?? "—"} <span className="text-sm font-normal text-muted-foreground">MATIC</span>
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground flex-1 truncate">
                  {address}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {/* NFT Summary */}
            <div className="p-4 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Screening NFTs</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MOCK_WALLET_DATA.nfts.map((nft) => (
                  <div
                    key={nft.tokenId}
                    className={cn(
                      "rounded-lg p-2 text-center text-[10px]",
                      nft.riskLevel === "LOW" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                      nft.riskLevel === "MEDIUM" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                      nft.riskLevel === "HIGH" && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    )}
                  >
                    <div className="font-bold text-xs">#{nft.tokenId}</div>
                    <div className="font-medium">{nft.riskLevel}</div>
                    <div className="opacity-70">{nft.childAgeMonths}mo</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  const url = chainId === 137
                    ? `https://polygonscan.com/address/${address}`
                    : `https://amoy.polygonscan.com/address/${address}`;
                  window.open(url, "_blank");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                View on Explorer
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
