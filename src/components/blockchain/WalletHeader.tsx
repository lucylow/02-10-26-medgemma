import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";
import { cn } from "@/lib/utils";

export function WalletHeader() {
  const wallet = usePediScreenWallet();

  const label = wallet.isConnected && wallet.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : "Connect wallet";

  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
      <button
        type="button"
        onClick={() => {
          if (!wallet.isConnected) {
            void wallet.connect();
          }
        }}
        className={cn(
          "px-4 py-2 md:px-5 md:py-3 rounded-2xl font-semibold text-xs md:text-sm shadow-xl backdrop-blur-sm flex items-center gap-2 md:gap-3 transition-all group min-w-[140px] justify-center",
          wallet.isConnected ? "wallet-connected scale-105" : "wallet-disconnected",
        )}
        aria-label={wallet.isConnected ? "Wallet connected" : "Connect wallet"}
      >
        {wallet.isConnected && (
          <span
            aria-hidden
            className="w-2.5 h-2.5 bg-emerald-300 rounded-full animate-pulse"
          />
        )}
        <span className="truncate max-w-[110px] md:max-w-[150px]">
          {label}
        </span>
        <svg
          className="w-4 h-4 opacity-80"
          aria-hidden
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
}

