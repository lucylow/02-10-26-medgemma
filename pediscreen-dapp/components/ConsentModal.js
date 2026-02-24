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
exports.ConsentModal = ConsentModal;
var react_1 = require("react");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var checkbox_1 = require("@/components/ui/checkbox");
var lucide_react_1 = require("lucide-react");
function ConsentModal(_a) {
    var _this = this;
    var open = _a.open, onOpenChange = _a.onOpenChange, analysisResult = _a.analysisResult, onConfirm = _a.onConfirm, onCancel = _a.onCancel;
    var _b = (0, react_1.useState)(false), consentGiven = _b[0], setConsentGiven = _b[1];
    var _c = (0, react_1.useState)(365), expiryDays = _c[0], setExpiryDays = _c[1];
    var _d = (0, react_1.useState)(false), isConfirming = _d[0], setIsConfirming = _d[1];
    var handleConfirm = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsConfirming(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, onConfirm(expiryDays)];
                case 2:
                    _a.sent();
                    onOpenChange(false);
                    return [3 /*break*/, 4];
                case 3:
                    setIsConfirming(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<dialog_1.Dialog open={open} onOpenChange={onOpenChange}>
      <dialog_1.DialogContent>
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="flex items-center gap-3">
            <lucide_react_1.ShieldCheck className="h-8 w-8 text-green-600"/>
            Secure Your Medical Record
          </dialog_1.DialogTitle>
        </dialog_1.DialogHeader>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Record details</h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="font-medium text-gray-700">Bone age:</span>
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.boneAgeMonths.toFixed(1)} months
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Fracture:</span>
                <div className="text-xl font-bold">
                  {analysisResult.fractureType === 'none' ? 'None detected' : 'Detected'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Confidence:</span>
                <div className="text-xl font-bold text-green-600">
                  {(analysisResult.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">AI model:</span>
                <div>MedGemma {analysisResult.aiModelVersion}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-gray-50 p-6">
            <div className="flex items-start space-x-3 rounded-lg border bg-white p-4">
              <checkbox_1.Checkbox id="patient-consent" checked={consentGiven} onCheckedChange={setConsentGiven}/>
              <label htmlFor="patient-consent" className="flex-1 cursor-pointer space-y-2">
                <div className="text-lg font-semibold">
                  I consent to create my encrypted medical NFT
                </div>
                <ul className="ml-4 list-disc space-y-1 text-sm">
                  <li>Your record is encrypted with your key (AES-256)</li>
                  <li>You own the NFT in your wallet</li>
                  <li>You control doctor access (grant/revoke)</li>
                  <li>Cost: ~$0.00025 Polygon gas + IPFS</li>
                </ul>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <lucide_react_1.Clock className="h-4 w-4"/>
                Access expires in:
                <select value={expiryDays} onChange={function (e) { return setExpiryDays(Number(e.target.value)); }} disabled={!consentGiven} className="ml-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:bg-gray-100">
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                  <option value={0}>Never (permanent)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row">
            <button_1.Button variant="outline" className="h-14 flex-1 text-lg" onClick={onCancel} disabled={isConfirming}>
              Cancel
            </button_1.Button>
            <button_1.Button className="h-14 flex-1 text-lg shadow-xl" onClick={handleConfirm} disabled={!consentGiven || isConfirming}>
              {isConfirming ? 'Creating…' : 'Create secure NFT record'}
              <lucide_react_1.Key className="ml-2 h-5 w-5"/>
            </button_1.Button>
          </div>

          <p className="text-center text-xs text-gray-500">
            HIPAA/GDPR compliant • You control access • Revoke anytime
          </p>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
