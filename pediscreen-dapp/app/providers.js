'use client';
"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Providers = Providers;
var react_query_1 = require("@tanstack/react-query");
var rainbowkit_1 = require("@rainbow-me/rainbowkit");
var wagmi_1 = require("wagmi");
var chains_1 = require("viem/chains");
require("@rainbow-me/rainbowkit/styles.css");
var projectId = (_a = process.env.NEXT_PUBLIC_WALLETCONNECT_ID) !== null && _a !== void 0 ? _a : 'YOUR_PROJECT_ID';
var config = (0, rainbowkit_1.getDefaultConfig)({
    appName: 'PediScreen AI',
    projectId: projectId,
    chains: [chains_1.polygonAmoy, chains_1.polygon],
    ssr: true,
});
var queryClient = new react_query_1.QueryClient();
function Providers(_a) {
    var children = _a.children;
    return (<wagmi_1.WagmiProvider config={config}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <rainbowkit_1.RainbowKitProvider>{children}</rainbowkit_1.RainbowKitProvider>
      </react_query_1.QueryClientProvider>
    </wagmi_1.WagmiProvider>);
}
