'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PediScreenDApp;
var react_1 = require("react");
var rainbowkit_1 = require("@rainbow-me/rainbowkit");
var ConsentNFTScreen_1 = require("@/components/ConsentNFTScreen");
var ConsentManager_1 = require("@/components/ConsentManager");
var MedGemmaAnalysis_1 = require("@/components/MedGemmaAnalysis");
function PediScreenDApp() {
    var _a = (0, react_1.useState)(null), analysisResult = _a[0], setAnalysisResult = _a[1];
    var _b = (0, react_1.useState)(false), showConsentManager = _b[0], setShowConsentManager = _b[1];
    return (<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-5xl font-black text-transparent">
            PediScreen AI
          </div>
          <h1 className="mx-auto mb-8 max-w-2xl text-3xl font-bold text-gray-900">
            Decentralized pediatric medical records
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Own your child&apos;s X-ray analysis as an NFT. Grant or revoke doctor access instantly.
          </p>
          <div className="mt-6 flex justify-center">
            <rainbowkit_1.ConnectButton />
          </div>
        </header>

        {!analysisResult ? (<MedGemmaAnalysis_1.MedGemmaAnalysis onComplete={setAnalysisResult}/>) : (<>
            <ConsentNFTScreen_1.ConsentNFTScreen analysisResult={analysisResult} onMinted={function () { return setShowConsentManager(true); }}/>
            {showConsentManager && <ConsentManager_1.ConsentManager />}
          </>)}
      </div>
    </div>);
}
