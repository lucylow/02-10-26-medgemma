import { createConfig, http } from "wagmi";
import { polygon, polygonAmoy } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { getChainRpcUrl } from "./blockchain";

const walletConnectProjectId =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || "";

export const chains = [polygonAmoy, polygon] as const;

export const config = createConfig({
  chains,
  connectors: [
    injected(),
    metaMask(),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [polygonAmoy.id]: http(getChainRpcUrl(polygonAmoy.id)),
    [polygon.id]: http(getChainRpcUrl(polygon.id)),
  },
});
