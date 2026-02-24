"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
var react_1 = require("react");
var variantClasses = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-transparent",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "border-transparent bg-transparent text-gray-700 hover:bg-gray-100",
    danger: "border-transparent bg-red-600 text-white hover:bg-red-700",
};
var sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-base rounded-xl",
    lg: "px-6 py-3 text-lg rounded-xl",
};
function Button(_a) {
    var _b = _a.variant, variant = _b === void 0 ? "primary" : _b, _c = _a.size, size = _c === void 0 ? "md" : _c, children = _a.children, _d = _a.className, className = _d === void 0 ? "" : _d, disabled = _a.disabled, rest = __rest(_a, ["variant", "size", "children", "className", "disabled"]);
    return (<button type="button" className={"inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ".concat(variantClasses[variant], " ").concat(sizeClasses[size], " ").concat(className)} disabled={disabled} {...rest}>
      {children}
    </button>);
}
