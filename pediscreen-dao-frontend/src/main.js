"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_query_1 = require("@tanstack/react-query");
var wagmi_1 = require("wagmi");
var rainbowkit_1 = require("@rainbow-me/rainbowkit");
var wagmi_2 = require("./config/wagmi");
var DAOContext_1 = require("./contexts/DAOContext");
var App_1 = require("./App");
require("@rainbow-me/rainbowkit/styles.css");
require("./index.css");
var queryClient = new react_query_1.QueryClient();
(0, client_1.createRoot)(document.getElementById("root")).render(<react_1.StrictMode>
    <wagmi_1.WagmiProvider config={wagmi_2.config}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <rainbowkit_1.RainbowKitProvider>
          <DAOContext_1.DAOProvider>
            <App_1.default />
          </DAOContext_1.DAOProvider>
        </rainbowkit_1.RainbowKitProvider>
      </react_query_1.QueryClientProvider>
    </wagmi_1.WagmiProvider>
  </react_1.StrictMode>);
