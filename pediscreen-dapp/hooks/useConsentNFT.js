'use client';
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
exports.useConsentNFT = useConsentNFT;
var react_1 = require("react");
var wagmi_1 = require("wagmi");
var viem_1 = require("viem");
var ipfs_1 = require("@/services/ipfs");
var consent_abi_1 = require("@/lib/consent-abi");
var CONSENT_NFT_ADDRESS = ((_a = process.env.NEXT_PUBLIC_CONSENT_NFT) !== null && _a !== void 0 ? _a : '');
function useConsentNFT() {
    var _this = this;
    var address = (0, wagmi_1.useAccount)().address;
    var _a = (0, react_1.useState)(''), dataKey = _a[0], setDataKey = _a[1];
    var signMessageAsync = (0, wagmi_1.useSignMessage)().signMessageAsync;
    var _b = (0, wagmi_1.useWriteContract)(), writeContractAsync = _b.writeContractAsync, txHash = _b.data, isPending = _b.isPending;
    var _c = (0, wagmi_1.useWaitForTransactionReceipt)({ hash: txHash }), isConfirming = _c.isLoading, isSuccess = _c.isSuccess;
    var mintConsentNFT = (0, react_1.useCallback)(function (medgemmaReport_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([medgemmaReport_1], args_1, true), void 0, function (medgemmaReport, consentExpiryDays) {
            var consentExpirySeconds, _a, ipfsHash, encryptionKey, dataKeyHashHex, dataKeyHashString, boneAgeScaled, confidenceScaled, messageHash, signature, record, hash;
            if (consentExpiryDays === void 0) { consentExpiryDays = 365; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!address)
                            throw new Error('Connect wallet first');
                        if (!CONSENT_NFT_ADDRESS)
                            throw new Error('NEXT_PUBLIC_CONSENT_NFT not set');
                        consentExpirySeconds = BigInt(consentExpiryDays === 0 ? 0 : consentExpiryDays * 24 * 60 * 60);
                        return [4 /*yield*/, ipfs_1.ipfsService.encryptAndPin(medgemmaReport)];
                    case 1:
                        _a = _b.sent(), ipfsHash = _a.ipfsHash, encryptionKey = _a.encryptionKey;
                        setDataKey(encryptionKey);
                        dataKeyHashHex = (0, viem_1.keccak256)((0, viem_1.toHex)(encryptionKey));
                        dataKeyHashString = typeof dataKeyHashHex === 'string' ? dataKeyHashHex : (0, viem_1.toHex)(dataKeyHashHex);
                        boneAgeScaled = BigInt(Math.floor(medgemmaReport.boneAgeMonths * 100));
                        confidenceScaled = BigInt(Math.floor(medgemmaReport.confidence * 100));
                        messageHash = (0, viem_1.keccak256)((0, viem_1.encodeAbiParameters)([
                            { type: 'string' },
                            { type: 'string' },
                            { type: 'uint256' },
                            { type: 'bool' },
                            { type: 'uint256' },
                        ], [
                            ipfsHash,
                            dataKeyHashString,
                            boneAgeScaled,
                            medgemmaReport.hasFracture,
                            consentExpirySeconds,
                        ]));
                        return [4 /*yield*/, signMessageAsync({
                                message: { raw: (0, viem_1.hexToBytes)(messageHash) },
                            })];
                    case 2:
                        signature = _b.sent();
                        if (!signature)
                            throw new Error('Signature denied');
                        record = {
                            encryptedIPFSHash: ipfsHash,
                            dataKeyHash: dataKeyHashString,
                            boneAgeMonths: boneAgeScaled,
                            hasFracture: medgemmaReport.hasFracture,
                            aiModelVersion: medgemmaReport.aiModelVersion,
                            confidence: confidenceScaled,
                            clinician: medgemmaReport.clinician,
                            createdAt: BigInt(Math.floor(Date.now() / 1000)),
                        };
                        return [4 /*yield*/, writeContractAsync({
                                address: CONSENT_NFT_ADDRESS,
                                abi: consent_abi_1.CONSENT_ABI,
                                functionName: 'mintConsentNFT',
                                args: [record, consentExpirySeconds, signature],
                            })];
                    case 3:
                        hash = _b.sent();
                        return [2 /*return*/, {
                                tokenId: BigInt(0),
                                ipfsHash: ipfsHash,
                                dataKey: encryptionKey,
                                txHash: hash,
                            }];
                }
            });
        });
    }, [address, signMessageAsync, writeContractAsync]);
    var grantDoctorAccess = (0, react_1.useCallback)(function (tokenId, doctorAddress, days) {
        if (days === void 0) { days = 30; }
        if (!CONSENT_NFT_ADDRESS)
            return;
        return writeContractAsync({
            address: CONSENT_NFT_ADDRESS,
            abi: consent_abi_1.CONSENT_ABI,
            functionName: 'grantViewerAccess',
            args: [tokenId, doctorAddress, BigInt(days * 24 * 60 * 60)],
        });
    }, [writeContractAsync]);
    var revokeDoctorAccess = (0, react_1.useCallback)(function (tokenId, doctorAddress) {
        if (!CONSENT_NFT_ADDRESS)
            return;
        return writeContractAsync({
            address: CONSENT_NFT_ADDRESS,
            abi: consent_abi_1.CONSENT_ABI,
            functionName: 'revokeViewerAccess',
            args: [tokenId, doctorAddress],
        });
    }, [writeContractAsync]);
    return {
        mintConsentNFT: mintConsentNFT,
        grantDoctorAccess: grantDoctorAccess,
        revokeDoctorAccess: revokeDoctorAccess,
        dataKey: dataKey,
        isMinting: isPending || isConfirming,
        isSuccess: isSuccess,
        txHash: txHash,
    };
}
