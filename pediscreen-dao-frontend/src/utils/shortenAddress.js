"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortenAddress = shortenAddress;
function shortenAddress(address, chars) {
    if (chars === void 0) { chars = 4; }
    if (!address || address.length < chars * 2 + 2)
        return address;
    return "".concat(address.slice(0, chars + 2), "...").concat(address.slice(-chars));
}
