import React from "react";
import { usePediScreenWallet } from "@/hooks/usePediScreenWallet";

const CHAINS = [
  { id: 137, name: "Polygon", recommended: true },
  { id: 8453, name: "Base" },
];

export const AccessibleChainSelector: React.FC = () => {
  const { chainId, switchChain } = usePediScreenWallet();

  const handleChange = async (id: number) => {
    if (chainId === id) return;
    await switchChain(id);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Active blockchain network"
      className="inline-flex bg-muted/60 p-1 rounded-full border border-border"
    >
      {CHAINS.map((chain) => {
        const isSelected = chainId === chain.id || (!chainId && chain.recommended);
        return (
          <label
            key={chain.id}
            className={`flex-1 text-center py-2 px-3 rounded-full cursor-pointer transition-colors relative text-xs sm:text-sm ${
              isSelected
                ? "ring-2 ring-emerald-300 bg-emerald-600 text-white font-semibold"
                : "text-foreground/80 hover:text-foreground hover:bg-background"
            }`}
          >
            <input
              type="radio"
              name="chain"
              value={chain.id}
              checked={isSelected}
              onChange={() => handleChange(chain.id)}
              className="sr-only"
              aria-hidden="true"
            />
            <span>{chain.name}</span>
            {isSelected && (
              <span className="sr-only">, selected network</span>
            )}
          </label>
        );
      })}
    </div>
  );
};

