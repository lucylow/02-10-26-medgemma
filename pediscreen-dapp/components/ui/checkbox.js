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
exports.Checkbox = Checkbox;
function Checkbox(_a) {
    var id = _a.id, checked = _a.checked, onCheckedChange = _a.onCheckedChange, disabled = _a.disabled, _b = _a.className, className = _b === void 0 ? '' : _b, props = __rest(_a, ["id", "checked", "onCheckedChange", "disabled", "className"]);
    return (<input type="checkbox" id={id} checked={checked} onChange={function (e) { return onCheckedChange === null || onCheckedChange === void 0 ? void 0 : onCheckedChange(e.target.checked); }} disabled={disabled} className={"h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ".concat(className)} {...props}/>);
}
