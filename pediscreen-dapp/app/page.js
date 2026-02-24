"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var link_1 = require("next/link");
function Home() {
    return (<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4">
      <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-4xl font-black text-transparent">
        PediScreen AI
      </h1>
      <p className="mb-8 max-w-md text-center text-gray-600">
        Decentralized pediatric medical records. X-Ray → MedGemma → Consent NFT → patient ownership.
      </p>
      <link_1.default href="/pediscreen" className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-purple-700">
        Open DApp
      </link_1.default>
    </div>);
}
