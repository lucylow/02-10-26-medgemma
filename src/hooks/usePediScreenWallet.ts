/**
 * PediScreen wallet connection (HIPAA blockchain, NFT mint, HealthChain).
 * Uses window.ethereum when available; for full WalletConnect/wagmi use pediscreen-dao-frontend or add wagmi to this app.
 */
import { useCallback, useEffect, useState } from "react";
import { CHAIN_ID, getChainRpcUrl } from "@/config/blockchain";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export interface UsePediScreenWalletResult {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (targetChainId: number) => Promise<void>;
  error: string | null;
}

export function usePediScreenWallet(): UsePediScreenWalletResult {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("No wallet found. Install MetaMask or another Web3 wallet.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      const acc = accounts?.[0] ?? null;
      setAddress(acc ?? null);
      if (acc) {
        const hexChainId = (await window.ethereum.request({
          method: "eth_chainId",
          params: [],
        })) as string;
        setChainId(hexChainId ? parseInt(hexChainId, 16) : null);
      } else {
        setChainId(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setAddress(null);
      setChainId(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) return;
    const hexChainId = `0x${targetChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
      setChainId(targetChainId);
    } catch (err: unknown) {
      const addChain = (err as { code?: number })?.code === 4902;
      if (addChain) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName:
                targetChainId === 80002
                  ? "Polygon Amoy"
                  : targetChainId === 84532
                    ? "Base Sepolia"
                    : `Chain ${targetChainId}`,
              rpcUrls: [getChainRpcUrl(targetChainId)],
            },
          ],
        });
        setChainId(targetChainId);
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts: unknown) => {
      const acc = Array.isArray(accounts) ? accounts[0] : null;
      setAddress(typeof acc === "string" ? acc : null);
    };
    const onChainId = (hexChainId: unknown) => {
      const hex = typeof hexChainId === "string" ? hexChainId : "";
      setChainId(hex ? parseInt(hex, 16) : null);
    };
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChainId);
    return () => {
      window.ethereum?.on?.("accountsChanged", () => {});
      window.ethereum?.on?.("chainChanged", () => {});
    };
  }, []);

  return {
    address,
    chainId,
    isConnecting,
    isConnected: !!address,
    connect,
    disconnect,
    switchChain,
    error,
  };
}
