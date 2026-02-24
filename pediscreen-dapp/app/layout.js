"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("./globals.css");
var providers_1 = require("./providers");
exports.metadata = {
    title: 'PediScreen AI — Decentralized Pediatric Medical Records',
    description: 'Own your child\'s X-ray analysis as an NFT. Grant/revoke doctor access instantly.',
};
function RootLayout(_a) {
    var children = _a.children;
    return (<html lang="en">
      <body className="antialiased">
        <providers_1.Providers>{children}</providers_1.Providers>
      </body>
    </html>);
}
