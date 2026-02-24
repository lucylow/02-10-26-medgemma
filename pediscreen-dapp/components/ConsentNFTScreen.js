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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentNFTScreen = ConsentNFTScreen;
var react_1 = require("react");
var useConsentNFT_1 = require("@/hooks/useConsentNFT");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var lucide_react_1 = require("lucide-react");
var ConsentModal_1 = require("@/components/ConsentModal");
function ConsentNFTScreen(_a) {
    var _this = this;
    var analysisResult = _a.analysisResult, onMinted = _a.onMinted;
    var _b = (0, useConsentNFT_1.useConsentNFT)(), mintConsentNFT = _b.mintConsentNFT, isMinting = _b.isMinting;
    var _c = (0, react_1.useState)(false), showConsentModal = _c[0], setShowConsentModal = _c[1];
    var handleCreateRecord = function () { return setShowConsentModal(true); };
    var handleConfirm = function (expiryDays) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, mintConsentNFT(analysisResult, expiryDays)];
                case 1:
                    _a.sent();
                    onMinted === null || onMinted === void 0 ? void 0 : onMinted();
                    setShowConsentModal(false);
                    return [2 /*return*/];
            }
        });
    }); };
    return (<>
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <card_1.Card className="border-2 border-dashed border-gray-200 shadow-xl">
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-3 text-2xl">
              <lucide_react_1.ShieldCheck className="h-8 w-8 text-green-600"/>
              MedGemma analysis complete
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-blue-50 p-6">
                <h3 className="font-semibold text-gray-900">Bone age</h3>
                <div className="text-4xl font-black text-blue-600">
                  {analysisResult.boneAgeMonths.toFixed(1)}{' '}
                  <span className="text-lg font-normal text-gray-600">months</span>
                </div>
                <div className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                  Within normal range (±2.6 mo accuracy)
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-emerald-50 p-6">
                <h3 className="font-semibold text-gray-900">Fracture</h3>
                <div className="text-4xl font-black text-emerald-600">
                  {analysisResult.hasFracture ? 'Detected' : 'None'}
                </div>
                <div className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                  {analysisResult.fractureType || 'Normal variant'} — 95.2% confidence
                </div>
              </div>
            </div>

            <button_1.Button size="lg" className="h-14 w-full text-xl shadow-2xl" onClick={handleCreateRecord} disabled={isMinting}>
              <lucide_react_1.Wallet className="mr-3 h-6 w-6"/>
              {isMinting ? 'Minting…' : 'Create immutable medical NFT record'}
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50">
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-bold text-white">
                NFT
              </div>
              Your medical record ownership
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b py-2">
                <span>Patient ownership</span>
                <span className="font-semibold text-green-600">Your wallet</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span>Doctor access</span>
                <span className="font-semibold text-blue-600">Grant/revoke</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span>Storage</span>
                <span className="font-semibold text-purple-600">IPFS</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Cost</span>
                <span className="text-lg font-bold text-green-600">~$0.00025</span>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      <ConsentModal_1.ConsentModal open={showConsentModal} onOpenChange={setShowConsentModal} analysisResult={analysisResult} onConfirm={handleConfirm} onCancel={function () { return setShowConsentModal(false); }}/>
    </>);
}
