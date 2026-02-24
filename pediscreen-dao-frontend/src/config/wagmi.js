"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.chains = void 0;
var wagmi_1 = require("wagmi");
var chains_1 = require("wagmi/chains");
var connectors_1 = require("wagmi/connectors");
var blockchain_1 = require("./blockchain");
var walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
exports.chains = [chains_1.polygonAmoy, chains_1.polygon];
exports.config = (0, wagmi_1.createConfig)({
    chains: exports.chains,
    connectors: __spreadArray([
        (0, connectors_1.injected)(),
        (0, connectors_1.metaMask)()
    ], (walletConnectProjectId
        ? [(0, connectors_1.walletConnect)({ projectId: walletConnectProjectId })]
        : []), true),
    transports: (_a = {},
        _a[chains_1.polygonAmoy.id] = (0, wagmi_1.http)((0, blockchain_1.getChainRpcUrl)(chains_1.polygonAmoy.id)),
        _a[chains_1.polygon.id] = (0, wagmi_1.http)((0, blockchain_1.getChainRpcUrl)(chains_1.polygon.id)),
        _a),
});
