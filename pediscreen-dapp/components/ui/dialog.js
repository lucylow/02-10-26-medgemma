'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = Dialog;
exports.DialogContent = DialogContent;
exports.DialogHeader = DialogHeader;
exports.DialogTitle = DialogTitle;
var react_1 = require("react");
var react_2 = require("@headlessui/react");
function Dialog(_a) {
    var open = _a.open, onOpenChange = _a.onOpenChange, children = _a.children;
    return (<react_2.Transition show={open} as={react_1.Fragment}>
      <react_2.Dialog className="relative z-50" onClose={function () { return onOpenChange(false); }}>
        <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30"/>
        </react_2.Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <react_2.Dialog.Panel className="mx-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              {children}
            </react_2.Dialog.Panel>
          </react_2.Transition.Child>
        </div>
      </react_2.Dialog>
    </react_2.Transition>);
}
function DialogContent(_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, onClose = _a.onClose, children = _a.children;
    return (<div className={"max-h-[90vh] overflow-y-auto sm:max-w-4xl ".concat(className)}>
      {children}
    </div>);
}
function DialogHeader(_a) {
    var children = _a.children;
    return <div className="border-b border-gray-200 p-6">{children}</div>;
}
function DialogTitle(_a) {
    var children = _a.children, _b = _a.className, className = _b === void 0 ? '' : _b;
    return (<react_2.Dialog.Title className={"text-2xl font-bold text-gray-900 ".concat(className)}>
      {children}
    </react_2.Dialog.Title>);
}
