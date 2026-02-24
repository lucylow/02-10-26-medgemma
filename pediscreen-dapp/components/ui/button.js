'use client';
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
exports.Button = void 0;
var react_1 = require("react");
var Button = (0, react_1.forwardRef)(function (_a, ref) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, _c = _a.variant, variant = _c === void 0 ? 'default' : _c, _d = _a.size, size = _d === void 0 ? 'md' : _d, props = __rest(_a, ["className", "variant", "size"]);
    var base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    var variants = {
        default: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500',
        outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-400',
        ghost: 'hover:bg-gray-100 focus:ring-gray-400',
    };
    var sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg h-14',
    };
    return (<button ref={ref} className={"".concat(base, " ").concat(variants[variant], " ").concat(sizes[size], " ").concat(className)} {...props}/>);
});
exports.Button = Button;
Button.displayName = 'Button';
