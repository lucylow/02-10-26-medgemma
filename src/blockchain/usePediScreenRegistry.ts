import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, type Provider, type Signer } from "ethers";
import { PEDISCREEN_REGISTRY_ABI } from "./pediscreenRegistryAbi";

const getBrowserProviderClass = (): new (provider: unknown) => Provider =>
  BrowserProvider;

const REGISTRY_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS as string | undefined;
const TARGET_CHAIN_ID = Number(
  (import.meta.env.VITE_CHAIN_ID as string | undefined) || 80001
);

export interface RegistryScreeningRecord {
  submittedBy: string;
  screeningIdHash: string;
  reportHash: string;
  createdAt: number;
  exists: boolean;
}

export function usePediScreenRegistry() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as Window & { ethereum?: unknown };
    if (!win.ethereum) return;
    const ProviderClass = getBrowserProviderClass();
    const p = new ProviderClass(win.ethereum);
    setProvider(p);
  }, []);

  const connect = useCallback(async () => {
    if (!provider) {
      throw new Error("No Ethereum provider found in browser");
    }
    if (!REGISTRY_ADDRESS) {
      throw new Error("VITE_REGISTRY_ADDRESS is not configured");
    }

    setError(null);
    const accounts = (await (provider as any).send("eth_requestAccounts", [])) as string[];
    const signerInstance = await (provider as any).getSigner();
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== TARGET_CHAIN_ID) {
      throw new Error(`Wrong network, please switch to chainId ${TARGET_CHAIN_ID}`);
    }

    setSigner(signerInstance);
    setAccount(accounts[0] ?? null);
    setChainId(Number(network.chainId));
  }, [provider]);

  const getContract = useCallback(() => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }
    if (!REGISTRY_ADDRESS) {
      throw new Error("VITE_REGISTRY_ADDRESS is not configured");
    }
    return new Contract(REGISTRY_ADDRESS, PEDISCREEN_REGISTRY_ABI, signer);
  }, [signer]);

  const recordScreening = useCallback(
    async (screeningIdHash: string, reportHash: string) => {
      const contract = getContract();
      const tx = await contract.recordScreening(screeningIdHash, reportHash);
      const receipt = await tx.wait();
      return receipt;
    },
    [getContract]
  );

  const getScreening = useCallback(
    async (screeningIdHash: string): Promise<RegistryScreeningRecord> => {
      if (!provider) {
        throw new Error("No Ethereum provider found in browser");
      }
      if (!REGISTRY_ADDRESS) {
        throw new Error("VITE_REGISTRY_ADDRESS is not configured");
      }
      const contract = new Contract(
        REGISTRY_ADDRESS,
        PEDISCREEN_REGISTRY_ABI,
        provider
      );
      const data = await contract.getScreening(screeningIdHash);
      return {
        submittedBy: data[0] as string,
        screeningIdHash: data[1] as string,
        reportHash: data[2] as string,
        createdAt: Number(data[3]),
        exists: data[4] as boolean,
      };
    },
    [provider]
  );

  return {
    provider,
    signer,
    account,
    chainId,
    error,
    connect,
    recordScreening,
    getScreening,
  };
}

