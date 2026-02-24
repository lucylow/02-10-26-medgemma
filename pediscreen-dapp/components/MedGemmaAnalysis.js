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
exports.MedGemmaAnalysis = MedGemmaAnalysis;
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var rainbowkit_1 = require("@rainbow-me/rainbowkit");
var lucide_react_1 = require("lucide-react");
var MOCK_CLINICIAN = '0x0000000000000000000000000000000000000001';
function MedGemmaAnalysis(_a) {
    var _this = this;
    var onComplete = _a.onComplete;
    var _b = (0, react_1.useState)(null), file = _b[0], setFile = _b[1];
    var _c = (0, react_1.useState)(false), analyzing = _c[0], setAnalyzing = _c[1];
    var _d = (0, react_1.useState)(false), dragOver = _d[0], setDragOver = _d[1];
    var handleFile = function (f) {
        if (!f || !f.type.startsWith('image/'))
            return;
        setFile(f);
    };
    var runAnalysis = function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!file)
                        return [2 /*return*/];
                    setAnalyzing(true);
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2100); })];
                case 1:
                    _a.sent();
                    result = {
                        boneAgeMonths: 96 + Math.random() * 12,
                        hasFracture: Math.random() > 0.85,
                        fractureType: 'none',
                        confidence: 0.92 + Math.random() * 0.06,
                        aiModelVersion: '1.0',
                        clinician: MOCK_CLINICIAN,
                    };
                    if (result.hasFracture)
                        result.fractureType = 'greenstick';
                    setAnalyzing(false);
                    onComplete(result);
                    return [2 /*return*/];
            }
        });
    }); };
    return (<card_1.Card className="border-2 border-dashed border-gray-200 shadow-xl">
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-3 text-2xl">
          <lucide_react_1.ImageIcon className="h-8 w-8 text-blue-600"/>
          X-Ray Analysis (MedGemma)
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-6">
        <p className="text-gray-600">
          Upload a pediatric hand X-ray. Analysis takes ~2s. Result is encrypted and can be minted as your consent NFT.
        </p>
        <div className={"rounded-2xl border-2 border-dashed p-12 text-center transition-colors ".concat(dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50')} onDragOver={function (e) {
            e.preventDefault();
            setDragOver(true);
        }} onDragLeave={function () { return setDragOver(false); }} onDrop={function (e) {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
        }}>
          <input type="file" accept="image/*" className="hidden" id="xray-upload" onChange={function (e) { var _a, _b; return handleFile((_b = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : null); }}/>
          <label htmlFor="xray-upload" className="cursor-pointer">
            {file ? (<p className="font-medium text-gray-900">{file.name}</p>) : (<>
                <lucide_react_1.Upload className="mx-auto h-12 w-12 text-gray-400"/>
                <p className="mt-2 text-gray-600">Drop image or click to upload</p>
              </>)}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <rainbowkit_1.ConnectButton />
          <button_1.Button size="lg" onClick={runAnalysis} disabled={!file || analyzing} className="bg-gradient-to-r from-blue-600 to-purple-600">
            {analyzing ? (<>
                <lucide_react_1.Loader2 className="mr-2 h-5 w-5 animate-spin"/>
                Analyzing… (~2.1s)
              </>) : ('Run MedGemma Analysis')}
          </button_1.Button>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
