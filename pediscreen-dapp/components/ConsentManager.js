'use client';
"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentManager = ConsentManager;
var react_1 = require("react");
var wagmi_1 = require("wagmi");
var useConsentNFT_1 = require("@/hooks/useConsentNFT");
var card_1 = require("@/components/ui/card");
var button_1 = require("@/components/ui/button");
var consent_abi_1 = require("@/lib/consent-abi");
var outline_1 = require("@heroicons/react/24/outline");
var CONSENT_NFT_ADDRESS = ((_a = process.env.NEXT_PUBLIC_CONSENT_NFT) !== null && _a !== void 0 ? _a : '');
function ConsentManager() {
    var _a;
    var address = (0, wagmi_1.useAccount)().address;
    var _b = (0, useConsentNFT_1.useConsentNFT)(), grantDoctorAccess = _b.grantDoctorAccess, revokeDoctorAccess = _b.revokeDoctorAccess;
    var _c = (0, react_1.useState)(''), doctorAddress = _c[0], setDoctorAddress = _c[1];
    var _d = (0, react_1.useState)(''), selectedTokenId = _d[0], setSelectedTokenId = _d[1];
    var _e = (0, react_1.useState)(30), grantDays = _e[0], setGrantDays = _e[1];
    var tokenIds = (0, wagmi_1.useReadContract)({
        address: CONSENT_NFT_ADDRESS || undefined,
        abi: consent_abi_1.CONSENT_ABI,
        functionName: 'getPatientTokens',
        args: address ? [address] : undefined,
    }).data;
    var tokens = (_a = tokenIds) !== null && _a !== void 0 ? _a : [];
    var tokenIdBigInt = selectedTokenId ? BigInt(selectedTokenId) : null;
    var handleGrant = function () {
        if (!tokenIdBigInt || !doctorAddress)
            return;
        grantDoctorAccess(tokenIdBigInt, doctorAddress, grantDays);
    };
    var handleRevoke = function () {
        if (!tokenIdBigInt || !doctorAddress)
            return;
        revokeDoctorAccess(tokenIdBigInt, doctorAddress);
    };
    return (<card_1.Card className="mt-8 border-2 border-gray-200 shadow-xl">
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-3">
          <outline_1.UserGroupIcon className="h-8 w-8 text-blue-600"/>
          Manage doctor access
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-6">
        <p className="text-gray-600">
          Grant or revoke view access to a doctor by wallet address. Access is enforced on-chain.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Your consent NFT (token ID)
            </label>
            <select value={selectedTokenId} onChange={function (e) { return setSelectedTokenId(e.target.value); }} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select token</option>
              {tokens.map(function (id) { return (<option key={id.toString()} value={id.toString()}>
                  #{id.toString()}
                </option>); })}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Doctor wallet address
            </label>
            <input type="text" value={doctorAddress} onChange={function (e) { return setDoctorAddress(e.target.value); }} placeholder="0x..." className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"/>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Access duration:</span>
            <select value={grantDays} onChange={function (e) { return setGrantDays(Number(e.target.value)); }} className="rounded-lg border border-gray-300 px-2 py-1">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <button_1.Button variant="outline" onClick={handleGrant} disabled={!selectedTokenId || !doctorAddress}>
            Grant access
          </button_1.Button>
          <button_1.Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleRevoke} disabled={!selectedTokenId || !doctorAddress}>
            <outline_1.NoSymbolIcon className="mr-2 h-4 w-4"/>
            Revoke access
          </button_1.Button>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
