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
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardTitle = CardTitle;
exports.CardContent = CardContent;
var react_1 = require("react");
function Card(_a) {
    var children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b, rest = __rest(_a, ["children", "className"]);
    return (<div className={"rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ".concat(className)} {...rest}>
      {children}
    </div>);
}
function CardHeader(_a) {
    var children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b;
    return <div className={"mb-4 ".concat(className)}>{children}</div>;
}
function CardTitle(_a) {
    var children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b;
    return (<h3 className={"text-lg font-semibold text-gray-900 ".concat(className)}>
      {children}
    </h3>);
}
function CardContent(_a) {
    var children = _a.children, _b = _a.className, className = _b === void 0 ? "" : _b;
    return <div className={className}>{children}</div>;
}
