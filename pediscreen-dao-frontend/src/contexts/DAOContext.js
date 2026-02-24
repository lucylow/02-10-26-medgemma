"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAOProvider = exports.PROPOSAL_STATE_MAP = void 0;
exports.useDAO = useDAO;
/**
 * PediScreen DAO — React context for governance: proposals, voting, execution, timelock
 */
var react_1 = require("react");
var wagmi_1 = require("wagmi");
var wagmi_2 = require("wagmi");
var viem_1 = require("viem");
var blockchain_1 = require("../config/blockchain");
exports.PROPOSAL_STATE_MAP = {
    0: "pending",
    1: "active",
    2: "canceled",
    3: "defeated",
    4: "succeeded",
    5: "queued",
    6: "expired",
    7: "executed",
};
var DAOContext = (0, react_1.createContext)(null);
var GOVERNOR_ADDRESS = (blockchain_1.PEDISCREEN_DAO_ADDRESS || "0x0");
var TOKEN_ADDRESS = (blockchain_1.PSDAO_TOKEN_ADDRESS || "0x0");
var TREASURY_ADDRESS = (blockchain_1.PEDISCREEN_TREASURY_ADDRESS || "0x0");
var TIMELOCK_ADDR = (blockchain_1.TIMELOCK_ADDRESS || "0x0");
var DAOProvider = function (_a) {
    var _b;
    var children = _a.children;
    var _c = (0, wagmi_1.useAccount)(), address = _c.address, chainId = _c.chainId, isConnected = _c.isConnected;
    var _d = (0, react_1.useState)([]), proposals = _d[0], setProposals = _d[1];
    var _e = (0, react_1.useState)(true), loading = _e[0], setLoading = _e[1];
    var _f = (0, react_1.useState)(0), proposalCount = _f[0], setProposalCount = _f[1];
    var userVotes = (0, wagmi_2.useReadContract)({
        address: TOKEN_ADDRESS !== "0x0" ? TOKEN_ADDRESS : undefined,
        abi: blockchain_1.PSDAO_ABI,
        functionName: "getVotes",
        args: address ? [address] : undefined,
    }).data;
    var userVotingPower = userVotes ? (0, viem_1.formatUnits)(userVotes, 18) : "0";
    var treasuryFromGovernor = (0, wagmi_2.useReadContract)({
        address: GOVERNOR_ADDRESS !== "0x0" ? GOVERNOR_ADDRESS : undefined,
        abi: blockchain_1.PEDISCREEN_DAO_ABI,
        functionName: "treasury",
    }).data;
    var treasuryAddress = (_b = treasuryFromGovernor) !== null && _b !== void 0 ? _b : TREASURY_ADDRESS;
    var timelockContractAddress = TIMELOCK_ADDR !== "0x0" ? TIMELOCK_ADDR : undefined;
    var timelockDelayWei = (0, wagmi_2.useReadContract)({
        address: timelockContractAddress,
        abi: blockchain_1.TIMELOCK_ABI,
        functionName: "getMinDelay",
    }).data;
    var timelockDelay = (0, react_1.useMemo)(function () {
        if (timelockDelayWei == null)
            return "Loading...";
        var seconds = Number(timelockDelayWei);
        var days = seconds / (24 * 60 * 60);
        return "".concat(days.toFixed(1), " days");
    }, [timelockDelayWei]);
    var writeDelegate = (0, wagmi_2.useWriteContract)().writeContract;
    var delegateTokens = (0, react_1.useCallback)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!address || TOKEN_ADDRESS === "0x0")
                return [2 /*return*/];
            writeDelegate({
                address: TOKEN_ADDRESS,
                abi: blockchain_1.PSDAO_ABI,
                functionName: "delegate",
                args: [address],
            });
            return [2 /*return*/];
        });
    }); }, [address, writeDelegate]);
    var _g = (0, wagmi_2.useWriteContract)(), writePropose = _g.writeContract, proposeTxHash = _g.data;
    var createPaymentRateProposal = (0, react_1.useCallback)(function (rate) { return __awaiter(void 0, void 0, void 0, function () {
        var rateWei;
        return __generator(this, function (_a) {
            if (GOVERNOR_ADDRESS === "0x0")
                return [2 /*return*/, undefined];
            rateWei = (0, viem_1.parseUnits)(rate.toString(), 6);
            writePropose({
                address: GOVERNOR_ADDRESS,
                abi: blockchain_1.PEDISCREEN_DAO_ABI,
                functionName: "proposePaymentRate",
                args: [rateWei],
            });
            return [2 /*return*/, proposeTxHash !== null && proposeTxHash !== void 0 ? proposeTxHash : undefined];
        });
    }); }, [writePropose, proposeTxHash]);
    var writeVote = (0, wagmi_2.useWriteContract)().writeContract;
    var voteOnProposal = (0, react_1.useCallback)(function (proposalId, support) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (GOVERNOR_ADDRESS === "0x0")
                return [2 /*return*/];
            writeVote({
                address: GOVERNOR_ADDRESS,
                abi: blockchain_1.PEDISCREEN_DAO_ABI,
                functionName: "castVote",
                args: [BigInt(proposalId), support],
            });
            return [2 /*return*/];
        });
    }); }, [writeVote]);
    var writeQueue = (0, wagmi_2.useWriteContract)().writeContract;
    var queueProposal = (0, react_1.useCallback)(function (proposalId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (GOVERNOR_ADDRESS === "0x0")
                return [2 /*return*/];
            writeQueue({
                address: GOVERNOR_ADDRESS,
                abi: blockchain_1.PEDISCREEN_DAO_ABI,
                functionName: "queue",
                args: [BigInt(proposalId)],
            });
            return [2 /*return*/];
        });
    }); }, [writeQueue]);
    var writeExecute = (0, wagmi_2.useWriteContract)().writeContract;
    var executeProposal = (0, react_1.useCallback)(function (proposalId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (GOVERNOR_ADDRESS === "0x0")
                return [2 /*return*/];
            writeExecute({
                address: GOVERNOR_ADDRESS,
                abi: blockchain_1.PEDISCREEN_DAO_ABI,
                functionName: "executeTimelockedProposal",
                args: [BigInt(proposalId)],
            });
            return [2 /*return*/];
        });
    }); }, [writeExecute]);
    var refetchProposals = (0, react_1.useCallback)(function () {
        setProposalCount(function (c) { return c + 1; });
    }, []);
    (0, react_1.useEffect)(function () {
        if (!isConnected || !chainId) {
            setLoading(false);
            setProposals([]);
            return;
        }
        setLoading(true);
        if (GOVERNOR_ADDRESS === "0x0") {
            setProposals([]);
            setLoading(false);
            return;
        }
        var target = treasuryAddress && treasuryAddress !== "0x0"
            ? treasuryAddress
            : TREASURY_ADDRESS;
        var demoProposals = [
            {
                id: "1",
                title: "Set Payment Rate $0.10",
                description: "Update clinician payment to $0.10 per screening (USDC, 6 decimals).",
                status: "active",
                forVotes: "0",
                againstVotes: "0",
                abstainVotes: "0",
                targets: target !== "0x0" ? [target] : [],
                values: [0n],
                calldatas: ["0x"],
            },
        ];
        setProposals(demoProposals);
        setLoading(false);
    }, [isConnected, chainId, proposalCount, treasuryAddress]);
    var value = (0, react_1.useMemo)(function () { return ({
        proposals: proposals,
        createPaymentRateProposal: createPaymentRateProposal,
        voteOnProposal: voteOnProposal,
        queueProposal: queueProposal,
        executeProposal: executeProposal,
        delegateTokens: delegateTokens,
        userVotingPower: userVotingPower,
        treasuryAddress: treasuryAddress !== "0x0" ? treasuryAddress : undefined,
        timelockAddress: TIMELOCK_ADDR !== "0x0" ? TIMELOCK_ADDR : undefined,
        timelockDelay: timelockDelay,
        loading: loading,
        chainId: chainId,
        refetchProposals: refetchProposals,
    }); }, [
        proposals,
        createPaymentRateProposal,
        voteOnProposal,
        queueProposal,
        executeProposal,
        delegateTokens,
        userVotingPower,
        treasuryAddress,
        timelockDelay,
        loading,
        chainId,
        refetchProposals,
    ]);
    return (<DAOContext.Provider value={value}>{children}</DAOContext.Provider>);
};
exports.DAOProvider = DAOProvider;
function useDAO() {
    var ctx = (0, react_1.useContext)(DAOContext);
    if (!ctx)
        throw new Error("useDAO must be used within DAOProvider");
    return ctx;
}
