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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipfsService = void 0;
exports.encryptPayload = encryptPayload;
exports.decryptPayload = decryptPayload;
var crypto_js_1 = require("crypto-js");
var PINATA_JWT = (_a = process.env.NEXT_PUBLIC_PINATA_JWT) !== null && _a !== void 0 ? _a : '';
function generateKey() {
    var array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(array);
    }
    else {
        for (var i = 0; i < 32; i++)
            array[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(array, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function encryptPayload(payload, key) {
    var json = JSON.stringify(payload);
    return crypto_js_1.default.AES.encrypt(json, key).toString();
}
function decryptPayload(cipher, key) {
    var bytes = crypto_js_1.default.AES.decrypt(cipher, key);
    var json = bytes.toString(crypto_js_1.default.enc.Utf8);
    if (!json)
        throw new Error('Decrypt failed');
    return JSON.parse(json);
}
function pinJsonToPinata(content) {
    return __awaiter(this, void 0, void 0, function () {
        var res, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!PINATA_JWT) {
                        return [2 /*return*/, "QmPlaceholder".concat(btoa(content).slice(0, 32))];
                    }
                    return [4 /*yield*/, fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: "Bearer ".concat(PINATA_JWT),
                            },
                            body: JSON.stringify({ pinataContent: { encrypted: content } }),
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        throw new Error('Pinata upload failed');
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data.IpfsHash];
            }
        });
    });
}
exports.ipfsService = {
    encryptAndPin: function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var encryptionKey, encrypted, ipfsHash;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        encryptionKey = generateKey();
                        encrypted = encryptPayload(payload, encryptionKey);
                        return [4 /*yield*/, pinJsonToPinata(encrypted)];
                    case 1:
                        ipfsHash = _a.sent();
                        return [2 /*return*/, { ipfsHash: ipfsHash, encryptionKey: encryptionKey }];
                }
            });
        });
    },
};
