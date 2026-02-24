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
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardTitle = CardTitle;
exports.CardContent = CardContent;
function Card(_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, props = __rest(_a, ["className"]);
    return (<div className={"rounded-2xl border border-gray-200 bg-white shadow-sm ".concat(className)} {...props}/>);
}
function CardHeader(_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, props = __rest(_a, ["className"]);
    return <div className={"p-6 pb-2 ".concat(className)} {...props}/>;
}
function CardTitle(_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, props = __rest(_a, ["className"]);
    return (<div className={"text-xl font-semibold leading-none tracking-tight text-gray-900 ".concat(className)} {...props}/>);
}
function CardContent(_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, props = __rest(_a, ["className"]);
    return <div className={"p-6 pt-4 ".concat(className)} {...props}/>;
}
